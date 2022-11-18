import { html2element } from "../../../helpers.js";
import Comment from "./Comment.js";
import ReplyComment from "./ReplyComment.js";

// If a general comment owns its replies, then keeping the replies in control is easy. What happens when someone else make a reply on a separate client though, and the data is just pushed to this client? How should the reply be added to the right parent? Maybe the reply should have an identifier that can be constructed from the comment (e.g. view id + author name + time), and that can be used to merge the comments. Then everytime a comment is pushed to the storage an update can be fired? Also, how will the changes be communicated back to the server? Let the backend handle the updates - just find the comment with the proper id, and resolve the differences, and then push any comments that had differences. Maybe it's simpler to just adjust everything when the connection closes?

// Sort the comments before passing them to the comments below. How will replies be updated? Ultimately everything should be coming from the server??


// This is just a template for the controls which allow the replies to be expanded or collapsed. These are invisible at first.
let template = `
<div style="display: none;">
  <div class="expand-controls" style="color: blue; cursor: pointer;">
    <i class="fa fa-caret-down"></i>
	<i class="control-text">View replies</i>
  </div>
  <div class="replies"></div>
</div>
`

// Maybe the general comments can be added on top, but the replies should follow in chronological order.
export default class GeneralComment extends Comment{
  
  replies = [];
  
  constructor(config){
    super(config)
	let obj = this;
	
	
	obj.replybutton = obj.node.querySelector("button.reply");
	
	// The general comment can have replies associated with it. Handle these here. Furthermore an additional control for expanding, reducing hte comments is required.
	obj.replynode = html2element(template);
	obj.node.appendChild( obj.replynode );
	
	// Add the functionality to the caret.
	obj.repliesExpanded = false;
	obj.replynode.querySelector("div.expand-controls").onmousedown = function(){
	    obj.repliesExpanded = !obj.repliesExpanded;
		obj.update();
	} // onclick
	
	// Replies on the config need to be initialised. But actually, they should be stored as separate entries for ease of updating...
	
	obj.update();
  } // constructor
  
  addreply(replyconfig){
	// No pushing of updated versions.
	let obj = this;
	
	// Make a comment node, and append it to this comment.
	let r = new ReplyComment(replyconfig);
	r.preview = obj.preview;
	r.previewend = obj.previewend;
	r.availabletags = obj.availabletags;
	r.update();
	
	// Add this one at the end.
	obj.replynode.querySelector("div.replies").appendChild(r.node);
	obj.replies.push(r);
	
	// Copy the submitvote function.
	r.submitvote = obj.submitvote;
	

	// Update the view.
	obj.update();
  } // addreply
  
  replaceReply(existing, replacement){
	// For simplicity handle the replacing of hte comment here.
	let obj = this;
	
	// Update the internal comments store.
	obj.replies.splice(obj.replies.indexOf(existing), 1, replacement);
	
	// Update teh DOM.
	let container = obj.node.querySelector("div.replies");
	container.insertBefore(replacement.node, existing.node);
  } // replaceReply
  
  
  update(){
	// Only the time is allowed to be updated (if it will be calculated back), and the up and down votes.
	let obj = this;
	
	
	// From superclass
	obj.updateTimestamp();
	obj.updateVoteCounter("upvote");
	obj.updateVoteCounter("downvote");
	obj.updateContent();
	
	// GeneralComment specific.
	obj.updateReplies();
  } // update
  
  // Update function in addition to the superclass ones.
  updateReplies(){
	let obj = this;
	
	// First update is called when the superclass constructor is called.
	if(obj.replies){
	  let n = obj.replies.length;
	  obj.replynode.style.display = n > 0 ? "" : "none";
	
	  // View replies or hide replies
	  let s = n == 1 ? "y" : `ies (${n})`
	  obj.replynode
	    .querySelector("div.expand-controls")
	    .querySelector("i.control-text")
	    .innerText = obj.repliesExpanded ? `Hide repl${s}` : `View repl${s}`;
		
	  obj.replynode
	    .querySelector("div.expand-controls")
	    .querySelector("i.fa")
	    .classList.value = obj.repliesExpanded ? "fa fa-caret-up" : "fa fa-caret-down";
	
	  obj.replynode.querySelector("div.replies").style.display = obj.repliesExpanded ? "" : "none";
	} // if
  } // updateReplies
  
} // GeneralComment

function findArrayItemById(A, id){
  let candidates = A.filter(a=>{
	return a.id == id;
  }) // filter
  
  return candidates.length > 0 ? candidates[0] : false;
} // findArrayItemById