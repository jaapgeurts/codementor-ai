var followupdetail = Handlebars.compile(`<a href="javascript:void(0)" id="lnk-detail-feedback-{{num}}" data-num="{{num}}">🚩&nbsp;repeated feedback</a> <div class="infobox detailbox" id="extrainfo-{{num}}"></div>`);
// Wrap the code in a function to avoid polluting the global scope
var followupmeaning = Handlebars.compile(`<a href="javascript:void(0)" id="lnk-meaning-feedback-{{num}}" data-num="{{num}}">💡&nbsp;explain more</a> <div class="infobox detailbox" id="extrainfo-{{num}}"></div>`);

// Wrap the code in a function to avoid polluting the global scope
var templateOutcome = Handlebars.compile('<li><span class="{{#if ismet}}positive{{else}}negative{{/if}}">{{remark}}.</span> {{explanation}}. {{{followup}}}</li>');
var templateAgain = Handlebars.compile('<li><span class="{{#if improved}}positive{{else}}negative{{/if}}">{{remark}}.</span> {{{followup}}}</li>');

var templateImprove = Handlebars.compile('<li>{{remark}}. {{{followup}}}</li>');
var templateUnderstand = Handlebars.compile('<li style="margin-bottom: 1em;">{{question}}<br/><span class="toggle-button" onclick="toggleVisibilityAnswer(this);">▶ </span><span id="hidden-sentence" class="hidden">{{answer}}</span></li>');
var templateNextStep = Handlebars.compile('<p class="nextstep"><b>Next step:</b> {{nextstep}}.</p>');
 
// reference to the vscode object
const vscode = acquireVsCodeApi();
  

(function () {

  var waitingForFeedback = false;

  var num = 1;

  function enableButtons() {
    btnannotate = document.getElementById('btn-annotate');
    btnannotate.disabled = false;
    btnannotate.classList.remove('btn-secondary');
    btnannotate.classList.add('btn-primary');

    btncustomfeedback = document.getElementById('btn-custom-feedback');
    btncustomfeedback.disabled = false;
    btncustomfeedback.classList.remove('btn-secondary');
    btncustomfeedback.classList.add('btn-primary');

    btnaskfeedback = document.getElementById('btn-ask-feedback');
    btnaskfeedback.disabled = false;
    btnaskfeedback.classList.remove('btn-secondary');
    btnaskfeedback.classList.add('btn-primary');
  }


  function showQuestionView() {
    viewinterface = document.getElementById('view-interface');
    viewinterface.classList.remove('hidden');

    viewresponse = document.getElementById('view-response');
    viewresponse.classList.add('hidden');

    viewrating = document.getElementById('view-rating');
    viewrating.classList.add('hidden');
  }

  function showResponseView() {
    viewinterface = document.getElementById('view-interface');
    viewinterface.classList.add('hidden');

    viewresponse = document.getElementById('view-response');
    viewresponse.classList.remove('hidden');

    viewrating = document.getElementById('view-rating');
    viewrating.classList.remove('hidden');
  }

  function enableIndicator() {
    let output = document.getElementById('busy-indicator');
    // Set a spinner to indicate that the request is being processed
    output.innerHTML = '<div class="d-flex justify-content-center"><div class="spinner-border" role="status"><span class="sr-only">Loading...</span></div></div>';
    waitingForFeedback = true;
  }

  function disableIndicator() {
    output = document.getElementById('busy-indicator');
    output.innerHTML = '';
    waitingForFeedback = false;
  }

  function requestFeedback(message) {
    enableIndicator();
    // clear the output area
    output = document.getElementById('output-answer');
    output.innerHTML = '';
    showResponseView();
    vscode.postMessage(message);
  }

  function requestDetailedFeedBack(event,remark) {
    console.log('Requesting detailed feedback for:', remark);
    var el = event.target;
  
    vscode.postMessage({
      command: "ask-detailed-feedback",
      remark: remark,
      num: el.getAttribute('data-num')
    });
  }

  function requestMeaningFeedBack(event,remark) {
    console.log('Requesting meaning feedback for:', remark);
    var el = event.target;
  
    vscode.postMessage({
      command: "ask-meaning-feedback",
      remark: remark,
      num: el.getAttribute('data-num')
    });
  }
  
  function processExtraInfo(message,container) {
    if (message.value.extrainfo) {
      const btndetail = container.querySelector(`#lnk-detail-feedback-${num}`);
      btndetail.onclick = (event) => { requestDetailedFeedBack(event,message.value.remark); };
      num++;
    } else {
      // attach the click event to the "What does this mean?" link
      const btndetail = container.querySelector(`#lnk-meaning-feedback-${num}`);
      btndetail.onclick = (event) => { requestMeaningFeedBack(event,message.value.remark + '. ' + message.value.explanation); };
      num++;
    }
  }

  function setBootstrapTheme(theme) {
    if (theme != "dark" && theme != "light") {
      console.error('Unknown theme:', theme);
      return;
    }
    viewinterface = document.getElementById('view-interface');
    viewinterface.setAttribute('data-bs-theme', theme);
    viewresponse = document.getElementById('view-response');
    viewresponse.setAttribute('data-bs-theme', theme);
  }

  ////////////////////////////////////////
  // Attach events to UI elements
  ////////////////////////////////////////
  window.onload = function () {
    // Respond to the predefined feedback button click
    document.getElementById("btn-ask-feedback").onclick = function (event) {
      num = 0;
      // Find the radio buttons and get the selected element
      let rbFeedback = document.getElementsByName('rb-feedbacktype');
      let feedbackType = Array.from(rbFeedback).find(rb => rb.checked);
      if (feedbackType) {
        selection = feedbackType.value;
        requestFeedback({
          command: "ask-feedback",
          feedbacktype: selection
        });
        output = document.getElementById('question-detail');
        output.innerHTML = feedbackType.nextElementSibling.textContent.trim();
        // btnReviewAgain = document.getElementById('btn-review-again');
        // if (selection === "outcome") {
        //   btnReviewAgain.classList.remove('hidden');
        // } else {
        //   btnReviewAgain.classList.add('hidden');
        // }
      }
      else {
        console.log("No feedback type selected");
        vscode.postMessage({command: 'alert', text: 'Please select a custom question' });
      }
    };
    ////////////////////////////////////////
    // respond to annotate button click
    ////////////////////////////////////////
    document.getElementById("btn-annotate").onclick = function (event) {
      requestFeedback({
          command: "ask-annotation",
      });
      output = document.getElementById('question-detail');
      output.innerHTML = "<i>You asked to annotate your code with feedback.</i>";
      output = document.getElementById('output-answer');
      output.innerHTML = '<i>Look at your code and hover over the annotations to see feedback details.</i>';
      // btnReviewAgain = document.getElementById('btn-review-again');
      // btnReviewAgain.classList.add('hidden');
    };
    ////////////////////////////////////////
    // respond to custom feedback button click
    ////////////////////////////////////////
    document.getElementById("btn-custom-feedback").onclick = function (event) {
      let tbCustomFeedback = document.getElementById("ta-custom-question");
      let customFeedback = tbCustomFeedback.value;
      tbCustomFeedback.value = "";
      if (customFeedback && /\S/.test(customFeedback)) {
        customFeedback = customFeedback.trim();
        requestFeedback({
          command: "ask-custom-feedback",
          question: customFeedback
        });
        output = document.getElementById('question-detail');
        output.innerHTML = customFeedback;
        // btnReviewAgain = document.getElementById('btn-review-again');
        // btnReviewAgain.classList.add('hidden');
      } else {
        vscode.postMessage({command: 'alert', text: 'Please enter a question.'});
      }
    };
    ////////////////////////////////////////
    // respond to the ask-rating button click
    ////////////////////////////////////////
    document.getElementById("btn-ask-rating").onclick = function (event) {
      //console.log("Sending message to the extension");
      // get selected value
      let radios = document.getElementsByName('radio-rating');
      let ratingValue = Array.from(radios).find(rb => rb.checked);
      let tbComment = document.getElementById('rating-comment');
      let comment = tbComment.value;
      tbComment.value = '';
      if (ratingValue) {
        vscode.postMessage({
          command: "submit-rating",
          rating: ratingValue.value,
          comment: comment
        });
        ratingValue.checked = false;
        showQuestionView();
      } else {
        vscode.postMessage({command: 'alert', text: 'Please select a rating or skip.'});
      }
    };
    // let btnreviewagain = document.getElementById("btn-review-again");
    // if (btnreviewagain) {
    //   btnreviewagain.onclick = function (event) {
    //     num = 0;
    //     requestFeedback({
    //       command: "review-again"
    //     });
    //   }
    // };
    ////////////////////////////////////////
    // respond to the skip-rating button click
    ////////////////////////////////////////
    document.getElementById("btn-skip-rating").onclick = function (event) {
      showQuestionView();
      // Showing a lot of messages gets old quickly
      // vscode.postMessage({command: 'alert', text: '🙁 It would really help me if you rated the feedback!'});
    };

    // set listeners for dark/light mode changes
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutationRecord) {
          if (mutationRecord.target.className == "vscode-dark") {
            setBootstrapTheme("dark");
          } else if (mutationRecord.target.className == "vscode-light") {
            setBootstrapTheme("light");
          }
      });
    });
    var target = document.body;
    observer.observe(target, { attributes : true, attributeFilter : ['class'] });

    // set the initial theme
    if (document.body.classList.contains("vscode-dark")) {
      setBootstrapTheme("dark");
    } else if (document.body.classList.contains("vscode-light")) {
      setBootstrapTheme("light");
    }    
  };
  
  ////////////////////////////////////////
  //
  // Listen for messages from the vscode extension
  //
  ////////////////////////////////////////
  window.addEventListener('message', (event) => {
    const message = event.data;

    // console.log('HTML: Received message:', message);
    var output;
    switch (message.type) {
      case 'end-response':
        disableIndicator();
        break;
      case 'update-response':
        output = document.getElementById('output-answer');
        // Escape the HTML to avoid XSS and other attacks (instead of using innerHTML)
        output.setHTMLUnsafe(message.value);
        break;
      case 'update-response-json':
        output = document.getElementById('output-answer');
        // Escape the HTML to avoid XSS and other attacks (instead of using innerHTML)
        console.log('Message value: ',message.value);
        const container = document.createElement('div');
        switch(message.kind) {
          case 'outcome':
            console.log('Outcome message:', message.value);
            if (message.value.extrainfo) {
              message.value.followup = followupdetail({num: num});
            } else {
              message.value.followup = followupmeaning({num:num});
            }
            container.setHTMLUnsafe(templateOutcome(message.value));
            processExtraInfo(message,container);
            break;
          case 'improve':
            message.value.num = num;
            if (message.value.extrainfo) {
              message.value.followup = followupdetail({num: num});
            }
            else {
              message.value.followup = followupmeaning({num:num});
            }
            message.value.explanation = '';
            container.setHTMLUnsafe(templateImprove(message.value));
            processExtraInfo(message,container);
            break;
          case 'understand':
            container.setHTMLUnsafe(templateUnderstand(message.value));
            break;
          case 'again':
            if (message.value.remark) {
              if (message.value.extrainfo) {
                message.value.followup = followupdetail({num: num});
              } else {
                message.value.followup = followupmeaning({num: num});
              }
              container.setHTMLUnsafe(templateAgain(message.value));
              processExtraInfo(message,container);
            }
            else if (message.value.nextstep)
              container.setHTMLUnsafe(templateNextStep(message.value));
            break;
          default:
            console.error('Unknown kind:', message.kind);
        }
        output.appendChild(container.firstChild);
        break;
        default:
          console.error('Unknown command:', message.type);
      case 'rating-thank-you':
        let outputrating = document.getElementById('output-rating');
        outputrating.innerHTML = "Thank you for your rating!";
        break;
      case 'detailed-feedback':
        console.log('Received detailed feedback:', message);
        output = document.getElementById(`extrainfo-${message.num}`);
        output.classList.add('show');
        output.scrollIntoView({behavior: "smooth", block: "nearest"});
        // Escape the HTML to avoid XSS and other attacks (instead of using innerHTML)
        output.setHTMLUnsafe(message.value);
        break;
      case 'meaning-feedback':
        console.log('Received meaning feedback:', message);
        output = document.getElementById(`extrainfo-${message.num}`);
        output.classList.add('show');
        output.scrollIntoView({behavior: "smooth", block: "nearest"});
        // Escape the HTML to avoid XSS and other attacks (instead of using innerHTML)
        output.setHTMLUnsafe(message.value);
        break;
      case 'enable-buttons':
        // enable the buttons
        enableButtons();
        
        break;
      case 'error':
        disableIndicator();

        output = document.getElementById('output-answer');
        paragraph = document.createElement('p');
        paragraph.style.color = 'red';
        paragraph.setHTMLUnsafe(message.value);
        output.appendChild(paragraph);
        break;
    }
  });

})();

function toggleVisibilityAnswer(button) {
  let sentence = button.nextSibling;
  if (sentence.classList.contains("hidden")) {
    sentence.classList.remove("hidden");
    button.textContent = "▼";
  } else {
    sentence.classList.add("hidden");
    button.textContent = "▶";
  }
}

function toggleVisibilityInfoBox(elem, targetid) {

  // to prevent page scrolling
  const currentScroll = window.scrollY;
  const newHeightBefore = document.body.scrollHeight;

  output = document.getElementById(targetid);
  output.classList.toggle("show");

  // reset page position
  const newHeightAfter = document.body.scrollHeight;
  window.scrollTo(0, currentScroll + (newHeightAfter - newHeightBefore));

}

