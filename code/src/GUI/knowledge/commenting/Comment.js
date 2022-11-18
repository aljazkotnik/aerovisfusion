import { html2element } from "../../../helpers.js";

let css = {
	
  button: `
    border: none;
	cursor: pointer;
	background-color: black;
  `,

	
  replybutton: `
    color: LightGray;
	padding: 0 0 0 0;
  `,
  
  votenumberi: `
    color: LightGray; 
    margin-left: 4px;
  `,
  
  timestampspan: `
	font-size: 14px;
	margin-left: 12px;
  `
}; // css

let template = `
<div class="comment" style="color: LightGray;">
  <div class="header">
    <b class="author"></b>
	<span class="timestamp" style="${ css.timestampspan }"></span>
  </div>
  <div class="body"></div>
  <div class="footer">
    <button class="upvote" style="${ css.button }">
	  <i class="icon">👍</i>
	  <i class="vote-number" style="${ css.votenumberi }"></i>
	</button>
	<button class="downvote" style="${ css.button }">
	  <i class="icon">👎</i>
	  <i class="vote-number" style="${ css.votenumberi }"></i>
	</button>
	<button class="reply" style="${ css.button } ${ css.replybutton }"><b>REPLY</b></button>
  </div>
</div>
`; // template



export default class Comment{
  
  user = "Default"
  
  // available tags.
  availabletags = []
	
  constructor(config){
	let obj = this;
	
	// Make a new node.
	obj.node = html2element(template);
	
	// Fill the template with the options from the config. There must be a comment, and there must be an author.
	obj.config = config;
	
	
	
	// Fill some options that may not be defined in config.
	obj.config.datetime  = config.datetime ? config.datetime : new Date().toISOString();
	obj.config.upvotes   = config.upvotes ? config.upvotes : [];
	obj.config.downvotes = config.downvotes ? config.downvotes : [];
	
	
	// Modify the node to reflect the config.
	let header = obj.node.querySelector("div.header");
	header.querySelector("b.author").innerText = config.author;
	
	
	
	obj.update();
	
	
	
	
	// Add the upvoting and downvoting. Where will the author name come from?? The upvote/downvote buttons should also be colored depending on whether the current user has upvoted or downvoted the comment already. Maybe the top app should just push the current user to the elements, and then they can figure out how to handle everything. That means that the functionality can be implemented here.
	
	let footer = obj.node.querySelector("div.footer")
	footer.querySelector("button.upvote").onmousedown = function(){
		obj.submitvote({id: obj.config.id, type: "upvote"})
	} // onclick
	
	footer.querySelector("button.downvote").onmousedown = function(){
		obj.submitvote({id: obj.config.id, type: "downvote"})
	} // onclick
	
  } // constructor
  
  
  update(){
	// Only the time is allowed to be updated (if it will be calculated back), and the up and down votes.
	let obj = this;
	
	obj.updateTimestamp();
	
	obj.updateVoteCounter("upvote");
	obj.updateVoteCounter("downvote");
	
	obj.updateContent();
  } // update
  
  
  updateContent(){
	let obj = this;
	obj.node.querySelector("div.body").innerHTML = obj.config.comment.replace(/#\w+/g, function(s){return obj.availabletags.includes(s) ? `<mark>${s}</mark>` : s});
	
	// Any mark tags need to interact with the view.
	obj.node.querySelector("div.body").querySelectorAll("mark").forEach(m=>{
		m.onmouseover = function(){
			obj.preview(m.innerText)
		} // onmouseover
		m.onmouseout = function(){
			obj.previewend(m.innerText)
		} // onmouseover
	}) // forEach
  } // updateContent
  
	
  updateTimestamp(){
	let obj = this;
	
	let timestamp = obj.node
	  .querySelector("div.header")
	  .querySelector("span.timestamp");
	  
	timestamp.innerText = formatTimeStamp( obj.config.datetime );
  } // updateTimestamp


  updateVoteCounter(buttonClassName){
	let obj = this;
	
	let button = obj.node
	  .querySelector("div.footer")
	  .querySelector(`button.${ buttonClassName }`)
	
	
	let icon = button.querySelector("i.icon");
	let counter = button
	  .querySelector("i.vote-number");
	
	let color = "black";
	let n = 0;
	switch( buttonClassName ){
	  case "upvote":
		n = obj.config.upvotes.length;
		counter.innerText = n > 0 ? n : "";
		
		color = obj.config.upvotes.includes(obj.user) ? "yellowgreen" : "black";
		icon.style.backgroundColor = color;
		button.style.backgroundColor = color;
		
		counter.style.color = color == "yellowgreen" ? "black" : "LightGray";
		break;
	  case "downvote":
		n = obj.config.downvotes.length;
		counter.innerText = n > 0 ? -n : "";
		
		color = obj.config.downvotes.includes(obj.user) ? "tomato" : "black";
		icon.style.backgroundColor = color;
		button.style.backgroundColor = color;
		
		counter.style.color = color == "tomato" ? "black" : "LightGray";
		break;
	} // switch

  } // updateVoteCounter
	
  
  // Dummy functionality.
  submitvote(vote){} // submitvote
  preview(){} // preview
  previewend(){} // previewend
} // Comment


  
  
  
function formatTimeStamp(t){
	
	
	// Dates are saved as strings for ease of comprehension. For formatting they are first translated into miliseconds passed since 1970.
	let now = new Date(Date.now());
	let stamp = new Date(t);
	
	let dayInMiliseconds = 1000*60*60*24;
	

	let todayInMiliseconds = ( ( now.getHours()*60 + now.getMinutes() )*60 + now.getSeconds() )*1000 + now.getMilliseconds();
		
	// Format the time so that it shows everything from today as n minutes/hours ago, everything from yesterday as yesterday at :... and everything else as the date. 
	if( stamp > now - todayInMiliseconds ){
	    // This was submitted today. Now figure out how long ago.
		let seconds = Math.floor( (now - stamp)/1000 );
		let minutes = Math.floor( seconds/60 );
		let hours   = Math.floor( minutes/60 );
		let days    = Math.floor( hours/24 );
		
		if(days > 0){
			return `${days} days ago`;
		} // if
		
		if(hours > 0){
			return `${hours} hours ago`;
		} // if
		
		if(minutes > 0){
			return `${minutes} minutes ago`;
		} // if
		
		return `${seconds} seconds ago`
				
	} else if (stamp > now - todayInMiliseconds - dayInMiliseconds){
		// Yesterday at HH:MM
		return `Yesterday at ${stamp.toLocaleTimeString()}`;
	} else {
		// Just keep the first 4 parts which should be day name, month name, day number, year number
		return stamp.toDateString()
	} // if
	
  } // updateTimestamp




















