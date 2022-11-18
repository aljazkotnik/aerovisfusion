

/*
This class should connect with the server to get and save the knowledge captured.

Where should the tree be drawn also? Top left, as before?


Where in the code hierarchy should KnowledgeManager sit? Below or above NavigationManager. Maybe above is fine?

What kind of knowledge is there, and what does it need to interact with, and how:

- Structured tags: name/value pairs equivalent to ordinal/categorical metadata variables
	ordinal name-spatial value pairs: global menu
	categorical name-spatial value pairs: global menu
- Unstructured tags: keywords saved as a list for each metadata row
    name: existing chapter form
- Annotations: timestamp/line/area data with a keyword attached
    name-timestep: existing chapter form
	name-line: drawing interaction
	name-area: drawing interaction
- Comments:
	text: exiting comment form


All properties	
id, taskId, author, datetime, name, value, timestamps, geometry, comment, upvotes, downvotes


Compulsory properties:
id, taskId, author, datetime, name


The id should be an annotation specific id!!! What should this be??? Just sequential numbers? Assigned at the server?

The tree should only track the knowledge, and not all the taskIds.
*/




/*
      Database doesn't exist yet - create Knowledge table. Single table could hold all possible annotations.
      
      id - annotation id, created on the fly by SQL table
      type - annotation type (tag, chapter, name-value pair,...)
      taskId - the taskId it corresponds to
      author - who contributed the knowledge
      datetime - when was it contributed, created server side
      name - tag name
      value - tag value
      timestamps - chapter start and end times saved as stringified array
      geometry - stringified array of [x,y] arrays
      comment - text comment
      upvotes - string of authors that upvoted, with special server-side update method
      downvotes - string of authros who downvoted, with special server-side update method
*/


/*



// Task 11 is in two groups!!
const testannotations = [
{id: "0", name: "green", taskId: "task 2", author: "Aljaz", datetime: "Tue Feb 08 2022"},
{id: "1", name: "green", taskId: "task 7", author: "Aljaz", datetime: "Tue Feb 08 2022"},
{id: "2", name: "green", taskId: "task 11", author: "Aljaz", datetime: "Tue Feb 08 2022"},
{id: "3", name: "blue", taskId: "task 5", author: "Aljaz", datetime: "Tue Feb 08 2022"},
{id: "4", name: "blue", taskId: "task 6", author: "Aljaz", datetime: "Tue Feb 08 2022"},
{id: "5", name: "blue", taskId: "task 11", author: "Aljaz", datetime: "Tue Feb 08 2022"},
{id: "6", name: "brown", taskId: "task 1", author: "Aljaz", datetime: "Tue Feb 08 2022"},
{id: "7", name: "brown", taskId: "task 3", author: "Aljaz", datetime: "Tue Feb 08 2022"},
{id: "8", name: "brown", taskId: "task 4", author: "Aljaz", datetime: "Tue Feb 08 2022"},
{id: "9", name: "brown", taskId: "task 8", author: "Aljaz", datetime: "Tue Feb 08 2022"},
{id: "10", name: "brown", taskId: "task 13", author: "Aljaz", datetime: "Tue Feb 08 2022"},
{id: "11", name: "brown", taskId: "task 15", author: "Aljaz", datetime: "Tue Feb 08 2022"}
]; // testannotations



const testannotations2 = [
{id: "0", name: "B", taskId: "task 1", author: "Aljaz", datetime: "Tue Feb 08 2022"},
{id: "1", name: "B", taskId: "task 2", author: "Aljaz", datetime: "Tue Feb 08 2022"},
{id: "2", name: "B", taskId: "task 3", author: "Aljaz", datetime: "Tue Feb 08 2022"},
{id: "3", name: "B", taskId: "task 4", author: "Aljaz", datetime: "Tue Feb 08 2022"},

{id: "4", name: "C", taskId: "task 3", author: "Aljaz", datetime: "Tue Feb 08 2022"},
{id: "5", name: "C", taskId: "task 4", author: "Aljaz", datetime: "Tue Feb 08 2022"},
{id: "6", name: "C", taskId: "task 5", author: "Aljaz", datetime: "Tue Feb 08 2022"},
{id: "7", name: "C", taskId: "task 6", author: "Aljaz", datetime: "Tue Feb 08 2022"},

{id: "8", name: "D", taskId: "task 3", author: "Magda", datetime: "Tue Feb 08 2022"},
{id: "9", name: "D", taskId: "task 4", author: "Magda", datetime: "Tue Feb 08 2022"},
{id: "10", name: "D", taskId: "task 5", author: "Magda", datetime: "Tue Feb 08 2022"},
{id: "11", name: "D", taskId: "task 6", author: "Magda", datetime: "Tue Feb 08 2022"},

{id: "12", name: "E", taskId: "task 7", author: "Magda", datetime: "Tue Feb 08 2022"},
{id: "13", name: "E", taskId: "task 8", author: "Magda", datetime: "Tue Feb 08 2022"},
{id: "14", name: "E", taskId: "task 9", author: "Magda", datetime: "Tue Feb 08 2022"},

{id: "15", name: "F", taskId: "task 3", author: "Aljaz", datetime: "Tue Feb 08 2022"},
{id: "16", name: "F", taskId: "task 4", author: "Aljaz", datetime: "Tue Feb 08 2022"},

{id: "17", name: "G", taskId: "task 8", author: "Magda", datetime: "Tue Feb 08 2022"},
{id: "18", name: "G", taskId: "task 9", author: "Magda", datetime: "Tue Feb 08 2022"},
]; // atestannotation2


*/





export default class KnowledgeManager{
  constructor(nm){
	let obj = this;
	
	// `nm' is a NavigationManager object.
	// Keep a reference to the navigation manager, because the tree navigation must have it's data updated with the knowledge, and the items can be accessed through it.
	obj.nm = nm;
	
	
	
	// Commenting needs to be updated if the username changes.
	document.getElementById("username").oninput = function(){
		let currentuser = document.getElementById("username").value;
		console.log(currentuser)
		obj.nm.items.forEach(item=>{
			item.annotations.commenting.user = currentuser;
		}) // forEach
	} // oninput
	
	
	
	
	

	/* WEBSOCKET INITIALISATION
	So - send over a list of taskIds, and then get back the initial set of comments.
	Everytime the connection is remade the comments will reload.
	*/

	
	const serverAddress = "wss://continuous-brief-nylon.glitch.me"; 
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





	/* IMPLEMENT THE POSTING DIRECTLY FROM THE FORMS
	The forms have dummy `submit' methods added to them, which receive the collected information as an input. The rest of the information should be fed into this object here.
	
	*/


	
	/* Configure the items to send things to the server
	WebSockets support sending and receiving: strings, typed arrays (ArrayBuffer) 
	and Blobs. Javascript objects must be serialized to one of the above types 
	before sending.
	
	type: comment allows the server to handle different packages differently.
	*/
	nm.items.forEach(item=>{
		// `tagform' holds the button to submit tag, tag-value, tag-geometry, and tag-sequence annotations.
		item.annotations.tagform.submit = function(tag){
			// Tag comes with at least the tag name from tagform.
			
			/* The author and taskId are obligatory
			Author is required to fom groups for the treenavigation, and the taskId allows the annotations to be piped to the corresponding data.
			*/ 
			if(obj.username){
				tag.taskId = item.task.taskId;
				tag.author = obj.username;
				
				// When stringifying an array all other properties are lost. Instead of explicitly stating that the geometry is closed just make the first and last points the same.
				tag.geometry = JSON.stringify(item.renderer.geometryannotation.submit());


				// Type tag is assigned so that tags are distinguished from queries and heartbeat pings. Tag type combinations are allowed by always extracting whatever is possible from hte tags. Possible values are controlled for on the server side.
				tag.type = "tag";
				
				
				obj.ws.send( JSON.stringify( tag ) );
			} else {
				alert("You need to log in")
			} // if			
		} // submit
		
		
		// Ah, with the commenting I want to have general comments and replies. And for the replies it's still the commentform that is used. So maybe that can be configured here actually. Ah, but it can't, because it depends on the dynamically generated comment DOM elements.
		item.annotations.commenting.form.submit = function(comment){
			if(obj.username){
				comment.taskId = item.task.taskId;
				comment.author = obj.username;
				comment.type = "tag";
				
				obj.ws.send( JSON.stringify( comment ) );
			} else {
				alert("You need to log in")
			} // if
		} // submit
		
		
		// The submit for voting needs to be added dynamically. So the function should be gvien to the specific commenting manager, and that needs to assign it onwards.
		item.annotations.commenting.submitvote = function(vote){
			if(obj.username){
				vote.author = obj.username;
				obj.ws.send( JSON.stringify( vote ) )
			} else {
				alert("You need to log in")
			} // if
		} // submitvote
	}) // forEach




	// Loop to keep updating the comments every 10 seconds - this is just so that the time labels are getting updated.
	/*
	function update(){
	  comments.forEach(c=>{
		c.update()
	  }) // forEach
	  setTimeout(update, 10*1000)
	} // update
	update();
	*/
  } // constructor
  
  
  get username(){
	return document.getElementById("username").value
  } // get username
  
  
  
  purge(){
	let obj = this;
	console.log("Purging")
	// What needs to be purged? The knowledge manager doesn't keep track of the individual annotations anyway? Maybe cause the underlying modules to drop their knowledge?
	
	// Purge the navigation tree of obsolete knowledge.
	obj.nm.tree.purge();
	
	
	// This is called before a query also. needs to purge comment sections, tag overviews, potentially chapters.
	obj.nm.items.forEach(item=>{
		// The annotation system will purge all its components.
		item.annotations.purge();
	}) // forEach
  } // purge
	
	
	
  // Processing of knowledge entries cannot rely on types, because these are no longer captured. Instead just define what the individual components require.
  process(d){
	let obj = this;
	
	
	// First a nice KLUDGE to get us going - it should only display knowledge relevant to this demo, and so filter out anything with an inappropriate taskId.
	let currenttasks = obj.nm.items.map(item=>item.task.taskId);
	d = d.filter(a=>currenttasks.includes(a.taskId));
	
	
	
	
	// the tree can handle anything with a tag name.
	let tags = d.filter(a=>a.name);
	tags.forEach(tag=>{
		obj.nm.tree.addtagannotation(tag);
	}) // forEach
	// console.log("Tags", d, tags)
	obj.nm.tree.update();
	
	
	// tags need to be distributed to the individual items also - there the available tags will be displayed to the user. The individual items also need them to see if the name of the new annotation is unique or not.
	let tagdistribution = distribution(tags);
	obj.nm.items.forEach(item=>{
		if(tagdistribution[item.task.taskId]){
			item.annotations.tagoverview.add(tagdistribution[item.task.taskId]);
		} // if
	}); // forEach
	
	
	// CLICKING ON CHPTER LABELS COULD ALLOW CHAPTE MODIFICATIONS!!
	// The chapters need to be distributed to hte appropriate items.
	let chapters = d.filter(a=>{
		if(a.timestamps){
			// Chpters should have their timestamps parsed back into JSON arrays.
			a.timestamps = JSON.parse(a.timestamps);
			return true
		} // if
		return false
	}); // filter
	
	let chapterdistribution = distribution(chapters);
	obj.nm.items.forEach(item=>{
		if(chapterdistribution[item.task.taskId]){
			// The chapters are routed to the playbar.
			item.renderer.ui.bar.addchapters(chapterdistribution[item.task.taskId]);
		} // if
	}) // forEach
	
	
	
	// COMMENTING ON GROUPS IS IMPOSSIBLE, ONLY ACTUAL INDIVIDUALS CAN BE DISCUSSED
	// Could be relaxed by just toring all the user ids for comments submitted through groups? Would have to implement a group specific way to return a stringified array of taskIds.
	let comments = d.filter(c=>c.comment); // filter
	
	// Parse the upvotes and downvotes - they shoul dbe arrays.
	comments.forEach(c=>{
		c.upvotes = c.upvotes ? JSON.parse(c.upvotes) : null;
		c.downvotes = c.downvotes ? JSON.parse(c.downvotes) : null;
	}) // forEach
	
	// console.log("Comments", comments)
	
	let commentsdistribution = distribution(comments);
	obj.nm.items.forEach(item=>{
		if(commentsdistribution[item.task.taskId]){
			// The comments are routed to the commenting manager.
			item.annotations.commenting.add(commentsdistribution[item.task.taskId]);
		} // if
	}) // forEach
	
	
	// Geometry tags need not be handled separately - TagOverview does what is appropriate.
	// let geometryannotations = d.filter(a=>a.geometry);
	// console.log(geometryannotations)
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
	obj.nm.items.forEach(item=>{
		item.annotations.commenting.generalcommentobjs.forEach(gc=>{
			updatevote(gc,d);
			gc.replies.forEach(rc=>{
				updatevote(rc,d);
			}) // forEach
		})
	}); // forEach
	
	
  } // processvote
  
  
} // KnowledgeManager




function distribution(A){
	// Create a distribution map for items in array A, by their taskId.
	let d = A.reduce((acc,a)=>{
		
		if(acc[a.taskId]){
			acc[a.taskId].push(a);
		} else {
			acc[a.taskId] = [a];
		} // if
		return acc
	},{})
	return d
} // distribution









