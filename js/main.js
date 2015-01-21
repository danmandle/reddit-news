$(document).ready(function() {
	startInterval();
	addSubredditsToTitle();
	addPostToDOM();
});

var subreddits = [
	'usnews',
	'worldnews',
	'news'
]

var oldestPost = {
	timestamp: null,
	id: null
};
var newestPost = {
	timestamp: null,
	id: null
};

var redditPosts = [];
var interval;
var currentlyFetching = false;

function startInterval(){
	interval = setInterval(addPostToDOM, 2000);

}

function addSubredditsToTitle(){
	var subsForDisplay = '';
	for(var i=0; i<subreddits.length; i++){
		subsForDisplay += '/r/' + subreddits[i];
		// if(i < subreddits.length - 1){
		// 	subsForDisplay += ', & ';
		// }
		// else
		if(i < subreddits.length - 1){
			// end of subs
			subsForDisplay += ', ';
		}
	}
	$('#fromSubreddits').text(subsForDisplay);
}

function addPostToDOM(){
	// console.log("left in array", redditPosts.length)
	if(redditPosts.length < 5 && !currentlyFetching){
		console.log("right here", redditPosts.length);
		currentlyFetching = true;
		fetchRedditPosts(addPostToDOM);
	}
	else if (!currentlyFetching) {
		var post = redditPosts.pop();

		var newPost = $('<div class="post"></div>');

		// var title = $('<div>').addClass('title').text('/r/'+post.subreddit + ' ' + post.title);
		var title = $('<div>').addClass('title').text(post.title);
		newPost.append(title);

		var details = $('<div>').addClass('details');
		var detailsBody = '<a href="https://reddit.com/r/'+post.subreddit+'">/r/'+post.subreddit+'</a> '
			detailsBody += '<i class="fa fa-arrow-up"></i> '
			detailsBody += post.score.toLocaleString() + ' ';
			detailsBody += '<a href="https://reddit.com'+post.permalink+'" target="_blank"><i class="fa fa-reddit"></i></a> ';
			detailsBody += '<a href="'+post.url+'" target="_blank"><i class="fa fa-external-link"></i></a> ';
			detailsBody += '<a href="https://reddit.com'+post.permalink+'" target="_blank"><i class="fa fa-comments-o"></i>'+post.num_comments.toLocaleString()+'</a> ';
			detailsBody += 'Posted by /u/'+post.author + ' ';
			detailsBody += '<span data-livestamp="'+post.created_utc+'"></span>';
		details.html(detailsBody);
		newPost.append(details);

		var sizePercent = post.score / largestUpvotes[post.subreddit];

		// 150 = 1.5 em + 1 em for min size
		var fontSize = ((sizePercent * 150) / 100) + 1;

		newPost.children('.title').css('font-size', fontSize + 'em');

		newPost.css({
			display: 'none'
		});

		// newPost.appendTo('#postContainer').show('slow');
		newPost.appendTo('#postContainer').slideDown('slow');

		newPost.hover(function(){
			// mouseenter
			// $(this).children('.details').show('slow');
			debounceShowDetails(this);
		}, function(){
			// mouseleave
			$(this).children('.details').hide('slow');
			// debounceHideDetails(this);
		});

	}
	else{

	}
}

var debounceShowDetails = _.debounce(function(self){
		$(self).children('.details').show('slow');
	}, 500);

var largestUpvotes = {};

function fetchRedditPosts(callback) {
	console.log('fetching posts');
	currentlyFetching = true;
	$.ajax({
		url: 'https://www.reddit.com/r/'+ subreddits.join('+') +'/hot.json?limit=100',
		// url: 'sampleRedditData.json',
		cache: false
	}).done(function(data) {
		console.log('posts back from reddit',data.data.children.length)
		data.data.children.forEach(function(post) {
			redditPosts.push(post.data);

			// if(post.data.created_utc > newestPost.timestamp) {
			// 	newestPost.timestamp = post.data.created_utc;
			// 	newestPost.id = post.data.id;
			// }
			// if(post.data.created_utc < oldestPost.timestamp) {
			// 	oldestPost.timestamp = post.data.created_utc;
			// 	oldestPost.id = post.data.id;
			// }

			if(!largestUpvotes[post.data.subreddit] || post.data.score > largestUpvotes[post.data.subreddit]){
				largestUpvotes[post.data.subreddit] = post.data.score;
			}

		});

		if(callback) {
			callback();
		}
		currentlyFetching = false;
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