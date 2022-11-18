import { html2element } from "../../../helpers.js";
import AddCommentForm from "./AddCommentForm.js";
import GeneralComment from "./GeneralComment.js"; 


// Needs a way to minimise the commenting completely.
let template = `
<div class="commenting" style="width:300px; margin-top: 10px;">
  <div class="hideShowText" style="cursor: pointer; margin-bottom: 5px; color: gray;">
    <b class="text">Show comments</b>
	<b class="counter"></b>
	<i class="fa fa-caret-down"></i>
  </div>
  <div class="commentingWrapper" style="display: none;">
    <div class="comment-form"></div>
    <hr>
    <div class="comment-tags"></div>
    <div class="comments" style="overflow-y: auto; max-height: 200px;"></div>
  </div>
</div>
`; // template


export default class CommentingManager{
	
  comments = [];
  generalcommentobjs = [];
  availabletags = [];
	
  constructor(){
    let obj = this;
	obj.node = html2element( template );
	
	
	// Make the form;
    obj.form = new AddCommentForm();
    obj.node.querySelector("div.comment-form").appendChild(obj.form.node);
  
  
	
	// Finally add teh controls that completely hide comments.
	let hsdiv = obj.node.querySelector("div.hideShowText");
	let cdiv = obj.node.querySelector("div.commentingWrapper");
	hsdiv.onmousedown = function(e){
	  e.stopPropagation();
	  let hidden = cdiv.style.display == "none";
	  cdiv.style.display = hidden ? "" : "none";
	  
	  // It changed from hidden to show, but hidden is past state.
	  hsdiv.querySelector("b.text").innerText = hidden ? "Hide comments" : "Show comments";
	  hsdiv.querySelector("i").classList.value = hidden ? "fa fa-caret-up" : "fa fa-caret-down";
	} // onmousedown
	
  } // constructor
  

  
  updateCommentCounter(){
	let obj = this;
	
	/*
	let n = obj.comments.reduce((acc,c)=>{
		acc += 1
		acc += c.replies.length;
		return acc
	},0)
	*/
	let n = obj.comments.length;
	let counterNode = obj.node
	  .querySelector("div.hideShowText")
	  .querySelector("b.counter");
	counterNode.innerText = n ? `(${n})` : "";
	
  } // updateCommentCounter
  
  
  purge(){
	let obj = this;
	obj.comments = [];
	obj.generalcommentobjs = [];
	let commentsToRemove = obj.node.querySelector("div.comments").children;
	for(let i=0; i<commentsToRemove.length; i++){
		commentsToRemove[i].remove();
	} // for
  } // purge
  
  

  
  add(comments){
	// The comments come solely from the server. They are not updated, and can just be created once.
	let obj = this;
	  
	// Store all of them as a record.
	obj.comments = obj.comments.concat(comments);
	
	
	// Replies are owned by the general comment. So maybe split them first into general comments, and replies, and add the general comments first, and then add the replies to the general comments.
	let replies = comments.filter(c=>c.ownerid);
	let general = comments.filter(c=>!c.ownerid);
	
	
	// Just add the new ones in.
	general.forEach(comment=>{
		let c = new GeneralComment(comment);
		c.preview = obj.preview;
		c.previewend = obj.previewend;
		c.availabletags = obj.availabletags;
		c.update();
		
		// Insert the new comment at teh very top.
		let container = obj.node.querySelector("div.comments");
		container.insertBefore(c.node, container.firstChild);
		obj.generalcommentobjs.push(c);
		
		
		// The general comment has a REPLY button - it needs to use the AddCommentForm submit function. That method is assigned from outside. The function here is different in that it assigns a parent id.
		c.replybutton.onmousedown = function(e){
			e.stopPropagation();
			let c = obj.form.config;
			c.ownerid = comment.id;
			obj.form.submit(c);
			obj.form.clear();
		} // onmousedown
		
		c.submitvote = obj.submitvote;
	}) // forEach
	
	
	// Replies need to be SORTED BY DATETIME!!
	replies.forEach(reply=>{
		// Find the owner.
		let ownercomment = obj.generalcommentobjs.find(gc=>gc.config.id==reply.ownerid);
		
		// This if is not strictly necessary, but just to play it safe.
		if(ownercomment){
			ownercomment.addreply(reply);
		} // if
	}) // forEach
	
	
	// Update the comment section header:
	obj.updateCommentCounter();
	
  } // add
  
  
  
  set user(name){
	let obj = this;
	
	// The comment appearance and functionality changes depends on who is checking them.
	obj.generalcommentobjs.forEach(gc=>{
	  gc.user = name;
	  gc.update();
	  
	  gc.replies.forEach(rc=>{
		  rc.user = name;
		  rc.update();
	  })
	}) // forEach
  } // set user
  
  
  
  updateAvailableTags(tagnames){
	  let obj = this;
	  obj.availabletags = tagnames;
	  obj.generalcommentobjs.forEach(gc=>{
		  gc.availabletags = tagnames;
		  gc.update();
		  
		  gc.replies.forEach(rc=>{
			rc.availabletags = tagnames;
		    rc.update();
		  })
	  })
  }
  
  
  
  // Dummy function
  submitvote(){} // submitvote
  preview(){} // preview
  previewend(){} // previewend
  
} // CommentingManager


function findArrayItemById(A, id){
  let candidates = A.filter(a=>{
	return a.id == id;
  }) // filter
  
  return candidates.length > 0 ? candidates[0] : false;
} // findArrayItemById

function arrayIncludesAll(A,B){
  // 'arrayIncludesAll' checks if array A includes all elements of array B. The elements of the arrays are expected to be strings.
	
  // Return element of B if it is not contained in A. If the response array has length 0 then A includes all elements of B, and 'true' is returned.
  var f = B.filter(function(b){
	return !A.includes(b)
  })
	
  return f.length == 0? true : false
} // arrayIncludesAll



























