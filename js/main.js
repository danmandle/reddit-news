$(document).ready(function() {
	getLocalStorage();
	addSubredditsToTitle();
	chooseRandomSub();
	addAnother();
	startInterval();
	window.onbeforeunload = beforeUnload;
});

var subreddits = [
	{
		name: 'News',
		feed: 'hot',
		color: '#84D9C9'
	},
	{
		name: 'Technology',
		feed: 'hot',
		color: '#4D8C7A'
	},
	{
		name: 'ShowerThoughts',
		feed: 'hot',
		color: '#D9BC2B'
	},
	{
		name: 'NotTheOnion',
		feed: 'hot',
		color: '#D93D3D'
	},
	{
		name: 'WorldNews',
		feed: 'hot',
		color: '#F27C38'
	}
];

var redditPosts = [];
var postsSeen = {};
var highestUpvotes = {};
var interval;
var postsPerSubreddit = 20;

$(document).on('open', '.remodal', function () {
	console.log('modal opened');
});

function startInterval(){
	interval = setInterval(addAnother, 2000);
}

function getLocalStorage() {
	var postsSeenLS = JSON.parse(localStorage.getItem('postsSeen'));
	postsSeen = (postsSeenLS) ? postsSeenLS : {};

	var subredditsLS = JSON.parse(localStorage.getItem('subreddits'));
	subreddits = (subredditsLS) ? subredditsLS : subreddits;

	var postsPerSubredditLS = JSON.parse(localStorage.getItem('postsPerSubreddit'));
	postsPerSubreddit = (postsPerSubredditLS) ? postsPerSubredditLS : postsPerSubreddit;
}
function saveLocalStorage() {
	localStorage.setItem('postsSeen', JSON.stringify(postsSeen));
	localStorage.setItem('subreddits', JSON.stringify(subreddits));
}
function beforeUnload(){
	saveLocalStorage();
	return null; // any non-void return will create an alert to the user
}

function addSubredditsToTitle(){
	var subsForDisplay = '';
	for(var i=0; i<subreddits.length; i++){
		subsForDisplay += '/r/' + subreddits[i].name;
		// if(i < subreddits.length - 1){
		// 	subsForDisplay += ', & ';
		// }
		// else
		if(i < subreddits.length - 1){
			// end of subs
			subsForDisplay += ', ';
		}

		var sub = $('<li></li>');
		sub.css({
			'background-color': subreddits[i].color,
		});
		sub.text('/r/' + subreddits[i].name);
		sub.attr('data-subid', i);
		sub.click(function(e){
			setSubreddit($(e.currentTarget).data('subid'));
		})

		$('#inactiveSubreddits').append(sub);
	}
	$('#fromSubreddits').text(subsForDisplay);
}

function addAnother (){
	grabOnePost()
	.then(addPostToDOM, qError);

	cleanup();
}

function qError (err) {
	console.debug('Error', err);
}

function chooseRandomSub(){
	var subId = Math.floor(Math.random() * (subreddits.length - 1));
	setSubreddit(subId);
}

function setSubreddit(subId){
	postCount = 0;
	activeSubreddit = subId;
	updateActiveSubreddit(subId);
}

function updateActiveSubreddit(subId){
	var currentlyActive = $('#activeSubreddit li');
	var currentlyActiveId = currentlyActive.data('subId');

	currentlyActive.appendTo('#inactiveSubreddits');

	$('#subredditContainer').css('background-color', subreddits[subId].color);

	$('#inactiveSubreddits li[data-subId='+ subId +']').appendTo('#activeSubreddit');
}

var postCount = 0;
var activeSubreddit = 0;
function grabOnePost(){
	var deferred = Q.defer();

	if(++postCount >= postsPerSubreddit){
		// time to move onto the next subreddit
		postCount = 0;
		if(activeSubreddit +1 >= subreddits.length){
			// you're reached the end of the line. Head back to the start
			activeSubreddit = 0;
		}
		else{
			// next sub
			activeSubreddit++;
		}

		updateActiveSubreddit(activeSubreddit);
	}

	var arrayOfPosts = redditPosts[subreddits[activeSubreddit].name] || [];

	if(arrayOfPosts.length < 10){
		fetchRedditPosts(subreddits[activeSubreddit]);
	}

	if(arrayOfPosts.length){ // there's at least one post
		var post = arrayOfPosts.shift(); // grab the post from the front

		post.seen = false;
		if(post.id in postsSeen || post.clicked){
			post.seen = true;
			post.scoreDiff = post.score - postsSeen[post.id];
		}
		else{
			post.scoreDiff = 0;;
		}
		postsSeen[post.id] = post.score;

		deferred.resolve(post);
	}
	else{
		deferred.reject('Not Enough Posts, grabbing more');
	}

	return deferred.promise;
}

function printSomeShit(){
	var template = _.template($('#post').html());

	var putThisInThere = template({myVar: 'yo dawg', showThisToo: true});

	$('#activeSubreddit').append(putThisInThere);
}

function addPostToDOM(post){
	window.aPost = post;

	var sizePercent = post.score / highestUpvotes[post.subreddit];

	// in ems
	var fontSize = (sizePercent * 2) + 1;


	post.subColor = subreddits[activeSubreddit].color
	post.headlineSize = fontSize;

	var postTemplate = _.template($('#post').html());

	var newPost = $(postTemplate(post));


	// var newPost = $('<div class="post"></div>');

	// var colorBar = $('<div class="colorBar"></div>');
	// colorBar.css('background-color', subreddits[activeSubreddit].color);
	// colorBar.appendTo(newPost);

	// var titleText = '';
	// titleText += (post.seen) ? '' : '<i class="fa fa-certificate"></i> ';
	// // titleText += '<span class="subreddit">/r/'+post.subreddit + '</span> ';
	// titleText += post.title

	// if(post.link_flair_text){
	// 	titleText += ' [' + post.link_flair_text + ']';
	// }

	// // var titleText = (post.seen) ? post.title : '<i class="fa fa-certificate"></i> ' + post.title;
	// titleText += (post.scoreDiff >= 50) ? ' <i class="fa fa-line-chart"></i> +' + post.scoreDiff.toLocaleString() : '';
	// var title = $('<div>').addClass('title').html(titleText);
	// newPost.append(title);

	// // TODO: move this to an Underscore template
	// var details = $('<div>').addClass('details');
	// var detailsBody = '<a href="https://reddit.com/r/'+post.subreddit+'">/r/'+post.subreddit+'</a> '
	// 	detailsBody += '<i class="fa fa-arrow-up"></i> '
	// 	detailsBody += post.score.toLocaleString() + ' ';
	// 	detailsBody += '<a href="https://reddit.com'+post.permalink+'" target="_blank"><i class="fa fa-reddit"></i></a> ';
	// 	detailsBody += '<a href="'+post.url+'" target="_blank"><i class="fa fa-external-link"></i></a> ';
	// 	detailsBody += '<a href="https://reddit.com'+post.permalink+'" target="_blank"><i class="fa fa-comments-o"></i>'+post.num_comments.toLocaleString()+'</a> ';
	// 	detailsBody += 'Posted by /u/'+post.author + ' ';
	// 	detailsBody += '<span data-livestamp="'+post.created_utc+'"></span>';
	// details.html(detailsBody);
	// newPost.append(details);

	// newPost.children('.title').css('font-size', fontSize + 'em');

	newPost.css({
		display: 'none'
	});

	// newPost.appendTo('#postContainer').show('slow');

	var speed = 500 * (1+(sizePercent*2));

	newPost.appendTo('#postContainer').slideDown(speed);

	newPost.click(function(){
		// mouseenter
		// $(this).children('.details').show('slow');
		debounceShowDetails(this);
	});
}

function stopAllThis(){
	clearInterval(interval);
}

function cleanup(){
	$('.post').each(function(index, el){
		var $el = $(el)
		if($el.offset().top < -$el.height()){
			$el.remove();
		}
	});
}

var debounceShowDetails = _.debounce(function(self){
		$(self).children('.details').show('slow');
	}, 500);


function fetchRedditPosts(subreddit, callback) {
	$.ajax({
		url: 'https://www.reddit.com/r/'+ subreddit.name +'/'+ subreddit.feed +'.json?limit=100',
		// url: 'sampleRedditData.json',
		cache: false
	}).done(function(data) {
		// console.log('posts back from reddit',data.data.children.length)
		data.data.children.forEach(function(post) {

			if(typeof redditPosts[subreddit.name] === 'undefined'){
				redditPosts[subreddit.name] = [];
			}

			redditPosts[subreddit.name].push(post.data);

			// if(post.data.created_utc > newestPost.timestamp) {
			// 	newestPost.timestamp = post.data.created_utc;
			// 	newestPost.id = post.data.id;
			// }
			// if(post.data.created_utc < oldestPost.timestamp) {
			// 	oldestPost.timestamp = post.data.created_utc;
			// 	oldestPost.id = post.data.id;
			// }

			if(!highestUpvotes[post.data.subreddit] || post.data.score > highestUpvotes[post.data.subreddit]){
				highestUpvotes[post.data.subreddit] = post.data.score;
			}

		});

		if(callback) {
			callback();
		}
	});
}

/*
A sample post

data: {
	domain: "reuters.com",
	banned_by: null,
	media_embed: { },
	subreddit: "worldnews",
	selftext_html: null,
	selftext: "",
	likes: null,
	user_reports: [ ],
	secure_media: null,
	link_flair_text: null,
	id: "2jersv",
	gilded: 0,
	secure_media_embed: { },
	clicked: false,
	report_reasons: null,
	author: "pnewell",
	media: null,
	score: 4042,
	approved_by: null,
	over_18: false,
	hidden: false,
	thumbnail: "",
	subreddit_id: "t5_2qh13",
	edited: false,
	link_flair_css_class: null,
	author_flair_css_class: null,
	downs: 0,
	mod_reports: [ ],
	saved: false,
	is_self: false,
	name: "t3_2jersv",
	permalink: "/r/worldnews/comments/2jersv/wind_blows_away_fossil_power_in_the_nordics_the/",
	stickied: false,
	created: 1413489212,
	url: "https://reuters.com/article/idUSL6N0S530M20141015?irpc=932",
	author_flair_text: null,
	title: "Wind blows away fossil power in the Nordics, the Baltics next. The arrival of wind power on a large scale has pushed electricity prices down, eroding profitability of fossil power stations.",
	created_utc: 1413460412,
	ups: 4042,
	num_comments: 921,
	visited: false,
	num_reports: null,
	distinguished: null
}

*/