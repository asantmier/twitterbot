// Helps to keep track of when MovieBott is active
console.log("MovieBott starting up!");

// Our Twitter library
var Twit = require('twit');

// Use fetch for OMDb API
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// We need to include our configuration file
var T = new Twit(require('./config.js'));

// This is the URL of a search for the latest tweets on the '#movie' hashtag.
var movieSearch = {q: "#movie", count: 50, result_type: "recent", lang: "en"}; 

// A list of common words that we don't want to include as candidates for most popular movie
var bannedWords = ["movie", "film", "cinema", "best", "movies", "films"];

//This sets up the twitter username to track mentions
const twitterUsername = '@MovieBott';

// This sets up a user stream
var stream = T.stream('statuses/filter', { track: twitterUsername });

// This calls the favoriteMovie function once the mention is found
stream.on('tweet', favoriteMovie);

// This calls the followed function once someone follows the bot
stream.on('follow', followed);

// Gets the rating of the movie from OMDb API
async function getRating(movie) {
	var rating = null
	await fetch('http://www.omdbapi.com/?apikey=a54ccb&t=' + movie)
	.then(response => response.json())
	.then(data => {
	  rating = data['imdbRating']
	});
	
	return rating
}

// This function finds the latest tweet with the #movie hashtag, and retweets it.
function retweetLatest() {
	T.get('search/tweets', movieSearch, async function (error, data) {
		// log out any errors and responses
		console.log(error, data);
		// If our search request to the server had no errors...
		if (!error) {
			// Dictionary containing all hashtags and their count in the search
			var hashtags = {}
			// Iterate over retreived tweets
			for (tweet of data.statuses) {
				// Iterate over hastags in each tweet
				for (tag of tweet.entities.hashtags) {
					content = tag['text']
					// We want to skip this hashtag if its one of our 'banned' words
					skip = false
					for (word of bannedWords) {
						if (content.toLowerCase().includes(word)) {
							skip = true
							break
						}
					}
					if (skip) continue
					// Add them to the hashtags dictionary or increase their count
					if (content in hashtags) {
						hashtags[content] += 1
					} else {
						hashtags[content] = 1
					}
				}
			}
			var mostPopular = null
			var mostPopularCount = 0
			// Iterate over gathered hashtags
			for (key in hashtags) {
				// Set as most popular if has higher count than previously most popular
				if (hashtags[key] > mostPopularCount) {
					mostPopular = key
					mostPopularCount = hashtags[key]
				}
			}
			var ratingString = ""
			// Look for a rating on this movie
			let rating = await getRating()
			if (rating == undefined) {
				// Notify if we couldn't find one
				console.log("Movie not found on IMDb")
			} else {
				// If we did find one, describe the rating in a string
				console.log("Movie successfully found on IMDb")
				ratingString = " (" + rating + " rating on IMDb)"
			}
			// Tweet which movie is the most popular right now
			T.post('statuses/update', {status: "A lot of people are talking about #" + mostPopular + ratingString + " right now!"}, function (error, response) {
				if (response) {
					console.log('Success! Check your bot, it should have retweeted something.')
				}
				// If there was an error with our Twitter call, we print it out here.
				if (error) {
					console.log('There was an error with Twitter:', error);
				}
			})
		}
		// However, if our original search request had an error, we want to print it out here.
		else {
			console.log('There was an error with your hashtag search:', error);
		}
	});
}

// Responds to tweets asking the bot its favorite movie
function favoriteMovie(tweet) {

	var id = tweet.id_str;
	var text = tweet.text;
	var name = tweet.user.screen_name;

	// regex looks for key-words in the text of the tweet
	let regex = /(What is your favorite movie?)/gi;
  
	
	let regexMatch = text.match(regex) || [];
	let regexFound = regexMatch.length > 0;
  
	// this helps with errors, so you can see if the regex matched and if regexFound is true or false
	console.log(regexMatch);
	console.log(regexFound);
  
  
	// checks text of tweet for mention of SNESSoundtracks
	if (text.includes(twitterUsername) && regexFound === true) {
  
	  // Start a reply back to the sender
	  var favMovieLink = "https://www.youtube.com/watch?v=k64P4l2Wmeg";
	  var replyText = ("@" + name + " My favorite movie is: The Terminator (1984). I think the overall concept is cool, and I think it's fun seeing bots like myself featured in films even if it's sci-fi. :)" + favMovieLink);
  
	  // Post that tweet
	  T.post('statuses/update', { status: replyText, in_reply_to_status_id: id }, errorMessage);
  
	} else {
	  console.log("The question: 'what is your favorite movie' was not mentioned.");
	};
  
	function errorMessage(err, reply) {
	  if (err) {
		console.log(err.message);
		console.log("Error");
	  } else {
		console.log('Tweeted: ' + reply.text);
	  }
	};
}

// Responds to follows with an @ message
function followed (eventMessage) {
	var screenName = eventMessage.source.screen_name;
	tweetStatus('@'+ screenName + ' Thank you for the follow!');
};

// Try to retweet something as soon as we run the program...
retweetLatest();
// ...and then every hour after that. Time here is in milliseconds, so
// 1000 ms = 1 second, 1 sec * 60 = 1 min, 1 min * 60 = 1 hour --> 1000 * 60 * 60
setInterval(retweetLatest, 1000 * 60 * 60);

