$(document).ready(function() {
	// on window ready....
	getLocalStorage();
	grabQueryStrings();
	// preloadPosts();
	addSubredditsToTitle();
	chooseRandomSub();
	// addAnother();
	// startInterval();
	window.onbeforeunload = beforeUnload;
	manageHashes();
	fillUpWindow();
});

var defaults = {
	subreddits: [{
		name: 'News',
		feed: 'hot',
		color: '#84D9C9'
	}, {
		name: 'Technology',
		feed: 'hot',
		color: '#4D8C7A'
	}, {
		name: 'ShowerThoughts',
		feed: 'hot',
		color: '#D9BC2B'
	}, {
		name: 'NotTheOnion',
		feed: 'hot',
		color: '#D93D3D'
	}, {
		name: 'WorldNews',
		feed: 'hot',
		color: '#F27C38'
	}],
	postsPerSubreddit: 20,
	addSpeed: 2000
}

// for use with query string subreddits
var prettyColors = ['#7F1637', '#047878', '#FFB733', '#F57336', '#C22121', '#56626B', '#6C9380', '#C0CA55', '#F07C6C', '#AD5472'];
var subreddits = [];
var redditPosts = [];
var postsSeen = {};
var highestUpvotes = {};
var interval;
var postsPerSubreddit = 20;
var addSpeed = 2000;
var seenCleanUp = 0;
var postCount = 0;
var activeSubreddit = 0;

// Initialization
function manageHashes(){
	var hash = window.location.hash;
	if(hash == "settings"){
		hash = '';
	} else if(hash == "#chromenewtab"){
		// fillWithPosts();
	}
}

$('div#loading').show();
function fillUpWindow() {
	var offset = $('.post.intro').offset().top;
	if(offset > 60) {
		grabOnePost().then(function(post){
			addPostToDOM(post, 100, function(){
				$('div#loading').fadeOut();
				fillUpWindow();
			});
		}, function(){
			setTimeout(fillUpWindow, 200);
		});
	} else {
		startInterval();
		console.log('started interval');
	}
}

function grabQueryStrings() {
	// to add subreddits via query strings for things like screen savers
	// index.html?subreddits=worldnews,news,technology (as long as you want, comma seperated)
	var subs;
	if (window.location.search) { // if it has query strings
		var regex = new RegExp("[\\?&]" + 'subreddits' + "=([^&#]*)");
		var results = regex.exec(location.search);
		subs = results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
		subs = subs.split(',');
		subreddits = []; // empty previous subreddits
		subs.forEach(function(name) {
			// grab a random color and remove it from the array
			var colorId = Math.floor(Math.random() * (prettyColors.length - 1));
			var color = prettyColors[colorId];
			prettyColors.splice(colorId, 1);
			// add the subreddit
			subreddits.push({
				name: name,
				feed: 'hot',
				color: color
			});
		});
	}
}

function preloadPosts() {
	// this will grab 100 from each subreddit so that the first time they appear, there isn't a pause while it's ajaxing
	for (var i = 0; i < subreddits.length; i++) {
		fetchRedditPosts(subreddits[i]);
	}
}

function startInterval() {
	interval = setInterval(addAnother, addSpeed);
}

function getLocalStorage() {
	// if there's a local storage item for it, set it
	var postsSeenLS = JSON.parse(localStorage.getItem('postsSeen'));
	postsSeen = (postsSeenLS) ? postsSeenLS : {};

	var subredditsLS = JSON.parse(localStorage.getItem('subreddits'));
	subreddits = (subredditsLS) ? subredditsLS : defaults.subreddits;

	var postsPerSubredditLS = localStorage.getItem('postsPerSubreddit');
	postsPerSubreddit = (postsPerSubredditLS) ? postsPerSubredditLS : defaults.postsPerSubreddit;

	var addSpeedLS = localStorage.getItem('addSpeed');
	addSpeed = (addSpeedLS) ? addSpeedLS : defaults.addSpeed;

	redditPosts = JSON.parse(localStorage.getItem('redditPosts')) || [];
	console.log('done getting local storage');
	console.log('array of posts', redditPosts);
}

function addSubredditsToTitle() {
	$('#activeSubreddit').empty();
	$('#inactiveSubreddits').empty();
	var subsForDisplay = '';
	for (var i = 0; i < subreddits.length; i++) {
		subsForDisplay += '/r/' + subreddits[i].name;
		// if(i < subreddits.length - 1){
		// 	subsForDisplay += ', & ';
		// }
		// else
		if (i < subreddits.length - 1) {
			// end of subs
			subsForDisplay += ', ';
		}
		var sub = $('<li></li>');
		sub.css({
			'background-color': subreddits[i].color,
		});
		sub.text('/r/' + subreddits[i].name);
		sub.attr('data-subid', i);
		sub.click(function(e) {
			setSubreddit($(e.currentTarget).data('subid'));
		})
		$('#inactiveSubreddits').append(sub);
	}
	// the title row
	$('#fromSubreddits').text(subsForDisplay);
}

function chooseRandomSub() {
	var subId = Math.floor(Math.random() * (subreddits.length - 1));
	setSubreddit(subId);
}

function setSubreddit(subId) {
	postCount = 0;
	activeSubreddit = subId;
	updateActiveSubreddit(subId);
}

function updateActiveSubreddit(subId) {
	var currentlyActive = $('#activeSubreddit li');
	var currentlyActiveId = currentlyActive.data('subId');
	currentlyActive.appendTo('#inactiveSubreddits');
	$('#subredditContainer').css('background-color', subreddits[subId].color);
	$('#inactiveSubreddits li[data-subId=' + subId + ']').appendTo('#activeSubreddit');
}

// Stuff involved with putting posts on the page

function addAnother() {
	// promises!
	grabOnePost().then(addPostToDOM, qError);
	cleanup();
}

function qError(err) {
	console.debug('Error', err);
}


function grabOnePost() {
	var deferred = Q.defer();
	if (++postCount >= postsPerSubreddit) {
		// time to move onto the next subreddit
		postCount = 0;
		if (activeSubreddit + 1 >= subreddits.length) {
			// you're reached the end of the line. Head back to the start
			activeSubreddit = 0;
		} else {
			// next sub
			activeSubreddit++;
		}
		updateActiveSubreddit(activeSubreddit);
	}
	// grab the array of posts from the reddit posts object by subreddit name
	var arrayOfPosts = redditPosts[subreddits[activeSubreddit].name] || [];

	if (arrayOfPosts.length < 10) {
		fetchRedditPosts(subreddits[activeSubreddit]);
	}

	if (arrayOfPosts.length) { // there's at least one post
		var post;
		var hoursAgo;

		do {
			post = arrayOfPosts.shift(); // grab the post from the front
			hoursAgo = moment().diff(post.downloadedAt, 'hours');
			if(hoursAgo > 6) {
				post = null;
			}

		} while(hoursAgo > 6 && arrayOfPosts.length);

		if(post){
			post.seen = false; // will override later
			if (post.id in postsSeen || post.clicked) {
				post.seen = true;
				if (isNaN(postsSeen[post.id])) { // originally I was just storing the post score
					post.scoreDiff = post.score - postsSeen[post.id].score;
				} else {
					post.scoreDiff = post.score - postsSeen[post.id];
				}
			} else {
				post.scoreDiff = 0;
			}

			// now that it has been seen, put it in the object
			postsSeen[post.id] = {
				score: post.score,
				seenAt: new Date()
			};

			deferred.resolve(post);
		} else {
			fetchRedditPosts(subreddits[activeSubreddit]);
			deferred.reject('All posts expired. Grabbing new ones.');
		}
	} else {
		deferred.reject('Not Enough Posts, grabbing more');
	}


	return deferred.promise;
}

function addPostToDOM(post, speed, callback) {
	if(callback === undefined){
		callback = function(){};
	}

	var sizePercent = post.score / highestUpvotes[post.subreddit];
	// in ems
	var fontSize = (sizePercent * 1.5) + 1;
	post.subColor = subreddits[activeSubreddit].color
	post.headlineSize = fontSize;
	var postTemplate = _.template($('#post').html());
	var newPost = $(postTemplate(post));
	newPost.css({
		display: 'none'
	});

	if(speed === undefined){
		var speed = 500 * (1 + (sizePercent * 2));
	}

	newPost.appendTo('#postContainer').slideDown(speed, callback);
	newPost.click(function() {
		$(this).children('.details').show('slow');
	});
}


var activelyFetching = {}
function fetchRedditPosts(subreddit, callback) {
	console.log('fetching');
	if(activelyFetching[subreddit.name]){

	} else {
		activelyFetching[subreddit.name] = true;
		$.ajax({
			url: 'https://www.reddit.com/r/' + subreddit.name + '/' + subreddit.feed + '.json?limit=100',
			// url: 'sampleRedditData.json',
			cache: false
		}).done(function(data) {
			// console.log('posts back from reddit',data.data.children.length)
			data.data.children.forEach(function(post) {
				if (typeof redditPosts[subreddit.name] === 'undefined') {
					redditPosts[subreddit.name] = [];
				}

				post.data.downloadedAt = new Date();

				redditPosts[subreddit.name].push(post.data);
				if (!highestUpvotes[post.data.subreddit] || post.data.score > highestUpvotes[post.data.subreddit]) {
					highestUpvotes[post.data.subreddit] = post.data.score;
				}
			});
			activelyFetching[subreddit.name] = false;
			if (callback) {
				callback();
			}
		});
	}
}

function cleanup() {
	$('.post').each(function(index, el) {
		var $el = $(el)
		if ($el.offset().top < -$el.height()) {
			$el.remove();
		}
	});
	var timeDiff = moment().diff(seenCleanUp, 'hours');
	if (timeDiff > 1) {
		_.each(postsSeen, function(postId, details) {
			if (moment().diff(details.seenAt, 'days') > 3) { // three days sounds reasonable, right?
				delete postsSeen[postId];
			}
		});
	}
}
// Saving Local Storage
function beforeUnload() {
	saveLocalStorage();
	return null; // any non-void return will create an alert to the user
}

function saveLocalStorage() {
	localStorage.setItem('postsSeen', JSON.stringify(postsSeen));
	localStorage.setItem('subreddits', JSON.stringify(subreddits));
	localStorage.setItem('postsPerSubreddit', postsPerSubreddit);
	localStorage.setItem('addSpeed', addSpeed);
	// localStorage.setItem('redditPosts', JSON.stringify(redditPosts));
	// console.log('saving redditPosts', JSON.stringify(redditPosts));
	// var saveThis = [];
	// for(var i=0; i < subreddits.length; i++){

	// }
}

// Settings Modal
$('#settingsCog').click(function(){
	var options = {hashTracking: false};
	$('[data-remodal-id=settings]').remodal(options).open();
});
$(document).on('open', '.remodal', readSettings);
$('#saveSettings').click(saveSettings);
$('#resetDefaults').click(function() {
	localStorage.clear();
	getLocalStorage();
	window.location.reload();
});

function readSettings() {
	$('#addPostTiming').val((addSpeed / 1000).toFixed(1));
	$('#postsPerSub').val(postsPerSubreddit);
	var subsDiv = $('.remodal #subs').empty();
	var settingSubTemplate = _.template($('#settingSub').html());
	for (var i = 0; i < subreddits.length; i++) {
		insertSubsInSettings(subreddits[i]);
	}
	editSubredditSettings();
}

function editSubredditSettings(e) {
	var subData = {}
	if (e) {
		var $el = $(e.currentTarget).parent();
		subData = {
			name: $el.attr('data-name'),
			color: $el.attr('data-color'),
			feed: $el.attr('data-feed')
		}
	} else {
		subData = {
			name: '',
			color: '#84D9C9',
			feed: 'hot'
		}
	}
	var settingNewSubTemplate = _.template($('#settingNewSub').html());
	var newSub = $(settingNewSubTemplate(subData));
	newSub.find('.colorSelector').ColorPicker({
		color: subData.color,
		onShow: function(colpkr) {
			$(colpkr).fadeIn(500);
			return false;
		},
		onHide: function(colpkr) {
			$(colpkr).fadeOut(500);
			return false;
		},
		onChange: function(hsb, hex, rgb) {
			$('.colorSelector').css('backgroundColor', '#' + hex).attr('data-color', '#' + hex);
		}
	});
	newSub.find('button').click(function(e) {
		$el = $(e.currentTarget).parent();
		subData = {
			name: $el.children('input#subName').val(),
			color: $el.children('.colorSelector').attr('data-color'),
			feed: $('select option:selected').text()
		}
		$el.remove();
		insertSubsInSettings(subData);
		editSubredditSettings();
	})
	newSub.appendTo($('.remodal #subs'));
}

function insertSubsInSettings(data) {
	var settingSubTemplate = _.template($('#settingSub').html());
	var newSub = $(settingSubTemplate(data));
	newSub.find('.edit').click(function(e) {
		$('.settingNewSub').remove();
		editSubredditSettings(e);
		$(e.currentTarget).parent().remove();
	});
	newSub.find('.remove').click(function(e) {
		$(e.currentTarget).parent().remove();
	});
	$('.remodal #subs').append(newSub);
}

function saveSettings() {
	addSpeed = $('#addPostTiming').val() * 1000;
	clearInterval(interval);
	startInterval();
	postsPerSubreddit = $('#postsPerSub').val();
	subreddits = [];
	$('.settingSub').each(function(index, el) {
		var $el = $(el);
		subreddits.push({
			name: $el.attr('data-name'),
			color: $el.attr('data-color'),
			feed: $el.attr('data-feed')
		});
	});
	addSubredditsToTitle();
	saveLocalStorage();
}
// Other stuffs
function stopAllThis() {
	clearInterval(interval);
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