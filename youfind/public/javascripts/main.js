var App = App || {};

App.main = (function(){
	var hasSwitchedToSecondView = false
 	var currentImageURL = null;
	var english = /^[A-Za-z0-9]*$/;

 	/* Reconfigure text field for search field after switching view */
	function configureTextField(input){
		window.fancyInput.setCaretHeight(input);
		window.fancyInput.inputResize(input);
	}

	/* Read uploaded image */
	function readImage(input) {
		if ( input.files && input.files[0] ) {
	        var FR= new FileReader();
	        FR.onload = function(e) {
	        	var uploadedImageData = e.target.result.replace(/^data:image\/(png|jpg|jpeg|gif);base64,/, "");
	        	$.ajax({
	        		url: 'https://api.imgur.com/3/image',
	        		type: 'POST',
	        		headers: {
	        			Authorization: 'Client-ID 33f456285414f75',
	        			Accept: 'application/json'
	        		},
	        		data: {
	        			image: uploadedImageData,
	        			type: 'base64'
	        		},
	        		dataType: 'JSON',
	        		success: function(json){
	        			currentImageURL = json.data.link;
	        			App.modal.removeAllModals();
	        		},
	        		error: function(json){
	        			// TODO: add notifications to user
	        			console.log("Cannot upload image");
	        		}
	        	})
	        };       
	        FR.readAsDataURL( input.files[0] );
    	}
	}

	/* Switch from initial view to second view */
	function switchToSecondView(input){
		if(!hasSwitchedToSecondView){
			var headerElement = $('.youfind-header');
			var textFieldElement = $('.text-field-1');
			$(headerElement).removeClass('youfind-header');
			$(headerElement).addClass('youfind-header-2');
			$(textFieldElement).removeClass('text-field-1');
			$(textFieldElement).addClass('text-field-2');
			configureTextField(input);
			hasSwitchedToSecondView = true;
		}
	}

	/* Check if image URL does exist */
	function imageExists(url, callback) {
	  	var img = new Image();
	  	img.onload = function() { callback(true); };
	  	img.onerror = function() { callback(false); };
	  	img.src = url;
	}

	function search() {
		console.log('Start searching');
		if(currentImageURL == null){
			console.log('There has not been any uploaded image');
			return;
		}
		processImageSearch();
	}

	function isEnglish(text) {
		for(var i = 0; i < text.length; i++){
			if(text.charCodeAt(i) > 127)
				return false;
		}
		return true;
	}

	function tokenizeText(text){

		var tokenizedTexts = text.split(/[.,\/ -]/);
		var filteredTerms = [];

		for(var i = 0; i < tokenizedTexts.length; i++){
			var token = tokenizedTexts[i];

			if(!isEnglish(token)) continue;  //remove non_English terms
				
			var filteredTokens = token.match(/[A-Za-z0-9]+/g); //remove special characters
			if(!filteredTokens) continue;
			filteredTokens.forEach(function(filteredToken){ 
				if(filteredToken != ""){
					filteredTerms.push(filteredToken.toLowerCase());
				}
			})
		}
		return filteredTerms;
	}



	function processImageSearch() {
		var googleImageSearchURL = 'https://images.google.com/searchbyimage?site=search&image_url=' + currentImageURL;
		var term_score_list = [];
		var term_list = [];

		$.ajax({
			url: '/search',
			type: 'GET',
			data: {
				searchURL: googleImageSearchURL
			},
			success: function(data) {
				var start = new Date();				
				var bestGuess = $(data).find(".qb-b").text();
				var searchResult = $(data).find(".srg");

				var tokenizedBestGuess = tokenizeText(bestGuess);
				appendToTermScoreList(tokenizedBestGuess, 5)

				$(searchResult).find('.rc').each(function(){
					var title = $(this).find('.r').text();
					var content = $(this).find('.st').text();

					//only consider English webpage
					if(!isEnglish(title)) return;

					var tokenizedTitle = tokenizeText(title);
					var tokenizedContent = tokenizeText(content);

					//add filtered terms to a final array
					appendToTermScoreList(tokenizedTitle, 3);
					appendToTermScoreList(tokenizedContent, 1, true);

					console.log(title);
					console.log("Best guess'\t"+tokenizedBestGuess);
					console.log("Filtered titles\t"+tokenizedTitle);
					console.log("Filtered contents\t"+tokenizedContent);
					console.log($(this));
				})
			    term_score_list.sort(compare);
				console.log("result");
				var result = "";
				term_score_list.forEach(function(term_score){
					result += term_score.term+" "+term_score.score+"\t";
				})
				console.log(result);
				var end = new Date();
				console.log("Timing for Dom analysis:\t"+(end-start)+" ms");
			},
			error: function(data) {
				console.log(data);
			}
		});

		function appendToTermScoreList(array, score, isSortNeeded){

			$.each(array, function(i, term){
				var matchIndex = $.inArray(term, term_list)
			    if(matchIndex === -1){
					var term_score = {term: term, score: score};
			    	term_score_list.push(term_score);
			    	term_list.push(term);
			    } else {
			    	term_score_list[matchIndex].score += score;
			    	if(term != term_score_list[matchIndex].term)
			    		console.log("Match error "+term+" "+term_score_list[matchIndex].term+" "+matchIndex);
			    }
			});
		}

		function compare(term_score1, term_score2){
			//sorted in descending order, so switch the order of the two terms
			return term_score2.score - term_score1.score;
		}
	}

	return {
		initializeFancyInput: function(){
			$('#searchTextField').fancyInput();
		},
		bindEnterKey: function() {
			$("#searchTextField").on('keypress', function(e){
				if(e.which == 13){ // is 'Enter' key
					switchToSecondView(this);
					//search();
				}
			});
		},
		bindUploadButton: function(){
			$('#imageFileChooser').change(function(e){
				readImage(this);
			});
		},
		bindAcceptButton: function(){
			$('.youfind-modal-accept').on('click', function(e){
				imageExists($('#imageURLTextField').val(), function(isValid){
					if(isValid){
						currentImageURL = $('#imageURLTextField').val();
						App.modal.removeAllModals();
					} else {
						// TODO: add notifications to user
						console.log('Invalid URL');
					}
				})
			});
		},
		bindSearchButton: function(){
			$('.search-button').on('click', function(e) {
				e.preventDefault();
				search();
			});
		}
	}
})();

$(document).ready(function(){
	App.main.initializeFancyInput();
	App.main.bindEnterKey();
	App.main.bindUploadButton();
	App.main.bindAcceptButton();
	App.main.bindSearchButton();
});