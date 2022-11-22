import { html2element } from "../../helpers.js";

import TagForm from "./tagging/TagForm.js";
import TagOverview from "./tagging/TagOverview.js";
import CommentingManager from "./commenting/CommentingManager.js";

/* COMMENTING SYSTEM

A class that handles all of the commenting system. Should be minimisable!!

*/

let template = `
<div style="user-select: none; webkit-user-select: none;"></div>
`; // template


// Add top caret that hides the whole thing!! And the chapterform should maybe include a draw button.

export default class AnnotationSystem{
  constructor(taskId, renderer, scene, camera){
	let obj = this;
	obj.sessionId = taskId;
	
	obj.dom = html2element(template);
	
	
	
	// How will the chapter form know which time is currently selected? Should there be a dummy version that is assigned from the outside? So that the accessing can be done only when needed?
	obj.tagform = new TagForm(renderer, scene, camera);
	obj.dom.appendChild( obj.tagform.node )
	
	
	// TagOverview requires a scene and a camera because the annotations need to add and remove elments to the scene.
	obj.tagoverview = new TagOverview(scene, camera);
	obj.dom.appendChild( obj.tagoverview.node );
	
	
	// Add in the commenting system. The metadata filename is used as the id of this 'video', and thus this player. The node needs to be added also.
	obj.commenting = new CommentingManager();
	obj.dom.appendChild( obj.commenting.node );

	
	
	
	// Setup the connection with the server.
	const serverAddress = "wss://mighty-gentle-silence.glitch.me"; 
	setupWebSocket();

	function setupWebSocket(){
		/*
		The websocket connection can be closed if there is a connection problem between
		the client and server, or if the connection is inactive for too long. In case
		there is an error when opening the connection the client tries to reconnect after
		1s. It also tries to reconnect if the connection is closed for some reason. To
		minimise the reconnections due to inactivity the client pings the server every t<300s
		to maintain the connection. The server pongs it back to keep the connection on its side.
		*/
		obj.ws = new WebSocket(serverAddress, "json");
		
		obj.ws.onerror = function(){
			setTimeout(setupWebSocket, 1000);
		}; // onerror
		
	  
		obj.ws.onopen = function(){
			// When the connection is initialised the server should send all pertinent comments.
			obj.ws.send( JSON.stringify({type: "query"}) )
		  
			function ping(){
			   // This should recursively call itself.
			   // console.log("ping")
			   obj.ws.send(JSON.stringify({type: "ping"}));
			   setTimeout(ping, 100*1000); // 299*1000   
			} // ping
			
			ping();
		}; // onopen
		
		// This will have to be reworked to differentiate between message and upvotes. Ultimately also annotations.
		obj.ws.onmessage = function(msg){
		  // Should differentiate between receiving a 'pong', receiving a single item, and receiving an array.
		  // A single item is just added, while an array requires a purge of existing comments first.
		  let action = JSON.parse( msg.data );
		  // console.log(action)
		  switch(action.type){
			case "pong":
			  break;
			case "query":
			  // Purge the existing comments
			  obj.purge();
			case "relay":
			  // But relays can be new comments, or they can be upvotes/downvotes/...
			  obj.process(action.data);
			  break;
			case "vote":
			  obj.processvote(action);
			  break;
		  }; // switch
		  
		}; // onmessage
	  
		obj.ws.onclose = function(){
			setTimeout(setupWebSocket, 1000);
		}; // onclose
	} // setupWebSocket
	
	
	
	// Commenting needs to know the current user so it can highlight the vote buttons correctly.
	obj.tagform.userinput.oninput = function(){
		obj.commenting.user = obj.tagform.userinput.value;
	} // oninput
	
	
	obj.tagform.submit = function(tag){
		// Tag comes with at least the tag name from tagform.
		
		// The author and taskId are obligatory
		//Author is required to fom groups for the treenavigation, and the taskId allows the annotations to be piped to the corresponding data. 
		
		tag.taskId = obj.sessionId;


		// Type tag is assigned so that tags are distinguished from queries and heartbeat pings. Tag type combinations are allowed by always extracting whatever is possible from hte tags. Possible values are controlled for on the server side.
		tag.type = "tag";
		
		
		obj.ws.send( JSON.stringify( tag ) );
			
	} // submit
	
	
	
	// Ah, with the commenting I want to have general comments and replies. And for the replies it's still the commentform that is used. So maybe that can be configured here actually. Ah, but it can't, because it depends on the dynamically generated comment DOM elements.
	obj.commenting.form.submit = function(comment){
		// Commenting only requires the author.
		let username = obj.tagform.author;
		if(comment && username){
			let tag = {
				taskId: obj.sessionId,
				author: username,
				comment: comment,
				type: "tag"
			}
			obj.ws.send( JSON.stringify( tag ) );
		} // if
	} // submit
	
	
	// The submit for voting needs to be added dynamically. So the function should be gvien to the specific commenting manager, and that needs to assign it onwards.
	obj.commenting.submitvote = function(vote){
		let username = obj.tagform.author;
		if( username ){
			vote.author = username;
			obj.ws.send( JSON.stringify( vote ) )
		} // if
	} // submitvote
	
	
	
  } // constuctor
  
  
  purge(){
	let obj = this;
	obj.tagoverview.purge();
	obj.commenting.purge();
  } // purge
  
  
  
  // Processing of knowledge entries cannot rely on types, because these are no longer captured. Instead just define what the individual components require.
  process(d){
	let obj = this;
	
	
	// First a nice KLUDGE to get us going - it should only display knowledge relevant to this demo, and so filter out anything with an inappropriate taskId.
	d = d.filter(a=>[obj.sessionId].includes(a.taskId));
	
	
	
	
	// Tags will have a name.
	let tags = d.filter(a=>a.name);
	obj.tagoverview.add(tags);
	
	
	
	
	// Comments.
	let comments = d.filter(c=>c.comment); // filter
	
	// Parse the upvotes and downvotes - they shoul dbe arrays.
	comments.forEach(c=>{
		c.upvotes = c.upvotes ? JSON.parse(c.upvotes) : null;
		c.downvotes = c.downvotes ? JSON.parse(c.downvotes) : null;
	}) // forEach
	obj.commenting.add(comments);
	
	
  } // process
  
  
  
  processvote(d){
	// A vote is received as a single item: vote = {id, type: vote, upvotes, downvotes};
	// Find the item with the appropriate comment id, and update that comment.
	let obj = this;
	
	
	// SHOULD BE MOVED TO COMMENTING MANAGER
	function updatevote(c,v){
		// Update comment `c' with a new voting object `v', if they have the same id.
		if(c.config.id==v.id){
			c.config.upvotes = v.upvotes;
			c.config.downvotes = v.downvotes;
			c.update();
		}; // if
	} // updatevote
	
	
	// Just updating the comment items doesn't work. Unless we update the comments, then purge the comment objects, and then create new ones?
	// Alternately loop through them.
	
	obj.commenting.generalcommentobjs.forEach(gc=>{
		updatevote(gc,d);
		gc.replies.forEach(rc=>{
			updatevote(rc,d);
		}) // forEach
	}) // forEach
	
	
	
  } // processvote
  
  
  
  
} // AnnotationSystem