import { html2element } from "../helpers.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import Stats from "stats.js";

// import PlayBarSlider from "./PlayBarSlider.js"
import Annotation3DManager from "./Annotation3DManager.js";
import CommentingManager from "./knowledge/commenting/CommentingManager.js";
import VistaManager from "./VistaManager.js";


const template = `
<div class="hud">
  <div class="stats"></div>
  <div class="lefttop"></div>
  <div class="righttop"></div>
</div>
`;


export default class SessionGUI{
	constructor(elementOptions, renderer, scene, camera, arcballcontrols){
		let obj = this;
		const author = "Aljaz"
		obj.sessionId = "Delta wing";
		obj.dom = html2element(template);
		
		
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
		
		
		
		
		
		
		
		
		
		
		
		
		
		// Add the Stats object.
		obj.stats = new Stats();
		obj.stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
		obj.dom.querySelector("div.stats").appendChild( obj.stats.dom );
		obj.stats.dom.style.left = "";
		obj.stats.dom.style.top = "";
		obj.stats.dom.style.right = "0px";
		obj.stats.dom.style.bottom = "0px";
		
		
		
		
		// GUI
		let lefttopdiv = obj.dom.querySelector("div.lefttop");
		let righttopdiv = obj.dom.querySelector("div.righttop");
		
		
		// The overall gui should only contain folders.
		obj.session = new GUI({
			container: righttopdiv,
			title: "Session controls",
			width: 256+7
		});
		
		// FOLDERS
		let fk = obj.session.addFolder("Knowledge");
		let fe = obj.session.addFolder("Elements");
		let fa = obj.session.addFolder("Add element");
		
		
		
		// ELEMENTS
		// The elements folder is dynamically populated, and a reference is needed.
		obj.elements = fe;
		
		
		// ADD ELEMENT
		// Populated from a predefined options list.
		obj.addElementOptions(fa, elementOptions);
		
		
		
		
		// VISTAS
		obj.vistas = new VistaManager( fk, arcballcontrols, camera );
		lefttopdiv.appendChild( obj.vistas.tagoverview.node );
		
		// Add in the commenting system. The metadata filename is used as the id of this 'video', and thus this player. The node needs to be added also.
		obj.commenting = new CommentingManager();
		lefttopdiv.appendChild( obj.commenting.node );
		
		
		
		// ANNOTATIONS
		obj.volumetags = new Annotation3DManager(fk, renderer, scene, camera);
		obj.volumetags.send = function(tag){
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
			if(comment && author){
				let tag = {
					taskId: obj.sessionId,
					author: author,
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
		
		
		
		
	} // constructor
	
	update(){
		let obj = this;
		obj.stats.update();
		obj.volumetags.annotations.update();
	} // update
	
	
	addElementOptions(addElementGUI, elementOptions){
		let obj = this;
		
		if(elementOptions){
			// Folder for addition of elements, which should have a dropdown to select element type, 
			// textbox to specify the file name, and a submit button


			// The button should open a modal, or append a selection to the GUI to configure the element to be added.
			const addElementConfig = {
				type: '',
				name: 'type in asset address',
				add: function(el){
					// Evaluate the current config and clear it.
					if( elementOptions[addElementConfig.type] ){
						let f = elementOptions[addElementConfig.type];
						f(addElementConfig.name);
					} // if
					
				} // add
			}

			addElementGUI.add( addElementConfig, "type", [''].concat( Object.keys(elementOptions)) ) // dropdown
			addElementGUI.add( addElementConfig, "name" ); 	// text field
			addElementGUI.add( addElementConfig, "add" ); 	// button
		} // if
		
	} // addElementOptions
	
	
	
	
	
	
	purge(){
		let obj = this;
		obj.vistas.tagoverview.purge();
		obj.volumetags.tagoverview.purge();
		// obj.tagoverview.purge();
		obj.commenting.purge();
	} // purge
  
  
  
	// Processing of knowledge entries cannot rely on types, because these are no longer captured. Instead just define what the individual components require.
	process(d){
		let obj = this;
		
		
		// First a nice KLUDGE to get us going - it should only display knowledge relevant to this demo, and so filter out anything with an inappropriate taskId.
		d = d.filter(a=>[obj.sessionId].includes(a.taskId));
		
		
		
		
		// Tags will have a name.
		let tags = d.filter(a=>a.name);
		// obj.tagoverview.add(tags);
		
		
		
		// Comments.
		let comments = d.filter(c=>c.comment); // filter
		
		// Parse the upvotes and downvotes - they shoul dbe arrays.
		comments.forEach(c=>{
			c.upvotes = c.upvotes ? JSON.parse(c.upvotes) : null;
			c.downvotes = c.downvotes ? JSON.parse(c.downvotes) : null;
		}) // forEach
		obj.commenting.add(comments);
		
		
		
		
		
		// 3D ANNOTATIONS
		obj.volumetags.add([])
		
		
		
		
		// VISTAS
		obj.addTestVistas();
		
		
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
	
	
	
	addTestVistas(){
		let obj = this;
		
		let s1 = '{"arcballState":{"cameraFar":20000,"cameraFov":45,"cameraMatrix":{"elements":[-0.24458883133152576,0.9696204502873743,0.003533549545494679,0,-0.12529558316531214,-0.035219341638882865,0.9914941325160673,0,0.9614974365161582,0.2420656529932234,0.1301034173794891,0,1.3064974365161675,100.40806565299322,0.2571034173794846,1]},"cameraNear":0.01,"cameraUp":{"x":-0.12529558316531209,"y":-0.035219341638882906,"z":0.9914941325160669},"cameraZoom":1,"gizmoMatrix":{"elements":[1,0,0,0,0,1,0,0,0,0,1,0,0.345,100.166,0.127,1]}}}';
		let s2 = '{"arcballState":{"cameraFar":20000,"cameraFov":45,"cameraMatrix":{"elements":[0.03522382110174042,-0.999005813628702,-0.02732520380619238,0,0.5872769130145653,-0.001431891646014316,0.8093848139954178,0,-0.808619261375263,-0.0445570872294348,0.5866426136162911,0,-0.4636192613752792,100.12144291277053,0.7136426136163074,1]},"cameraNear":0.01,"cameraUp":{"x":0.5872769130145653,"y":-0.001431891646013983,"z":0.8093848139954178},"cameraZoom":1,"gizmoMatrix":{"elements":[1,0,0,0,0,1,0,0,0,0,1,0,0.345,100.166,0.127,1]}}}';
		let s3 = '{"arcballState":{"cameraFar":20000,"cameraFov":45,"cameraMatrix":{"elements":[-0.994002829093867,0.04073845222355828,-0.10148277816368909,0,-0.10241687998282231,-0.6720877387470915,0.7333545214426685,0,-0.03832960276308385,0.7393500185543046,0.6722294188859738,0,0.3066703972368927,100.90535001855432,0.7992294188859859,1]},"cameraNear":0.01,"cameraUp":{"x":-0.10241687998282233,"y":-0.6720877387470915,"z":0.7333545214426687},"cameraZoom":1,"gizmoMatrix":{"elements":[1,0,0,0,0,1,0,0,0,0,1,0,0.345,100.166,0.127,1]}}}';
		
	
		let vistas = [
		{name: "Vista 1",
		 vista: s1
		},
		{name: "Vista 2",
		 vista: s2
		},
		{name: "Vista 3",
		 vista: s3
		}
		]
		obj.vistas.add(vistas)		
	} // addTestVistas
	
	
} // SessionGUI	
	
	
