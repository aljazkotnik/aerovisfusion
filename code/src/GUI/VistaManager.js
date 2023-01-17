/*
Vistas will be added in the menu, to keep the theme of annotations.
 - Menu to add vistas

Vistas will be displayed in the comment section.
 - Module to display vistas required.
 - Vistas need to have tag buttons
 - Tag buttons need to navigate to the vista when clicked
 - The transition should be eased.
 

*/


// The VistaManager will require a TagOverview to show the vistas available.
import TagOverview from "./knowledge/tagging/TagOverview.js";



export default class VistaManager{
  constructor(lilguimenu, arcballcontrols, camera){
    let obj = this;
	
	obj.arcballcontrols = arcballcontrols;
	obj.camera = camera;
	
	
	// The menu to add vistas
	obj.addmenuconfig = {
		name: "",
		submit: function(){
			console.log( obj.getVista() )
		}
	}; // addmenuconfig
	
	let menufolder = lilguimenu.addFolder("Vistas");
	menufolder.add( obj.addmenuconfig, "name" );
	menufolder.add( obj.addmenuconfig, "submit" );
	
	
	
	// The menu to display vista names.
	obj.tagoverview = new TagOverview("Vistas", function(tag){
		obj.moveToVista( tag.vista )
	});
	
	
	
	
  } // constructor
  
  
  add( vistas ){
	// Add vistas received from the server.
	// They need to be added to the overview. And the overview should already have an add function anyway.
	let obj = this;
	obj.tagoverview.add( vistas );
  } // add
  
  moveToVista( vistaState ){
	let obj = this;
	// `af' is the arcballcontrols focus point, and `cp' is the position to which the camera needs to move.
	// obj.arcballcontrols.focus( v.focus.point, v.focus.size, v.focus.amount );
	// obj.camera.position.copy( v.camera.position );
	// obj.camera.rotation.set( v.camera.rotation.x, v.camera.rotation.y, v.camera.rotation.z );
	
	// Do I need to change the focus? The user can do it if they want to later, no?
	
	obj.arcballcontrols.setStateFromJSON( vistaState )
	// obj.arcballcontrols.update();
  } // moveToVista
  
  getVista(){
	let obj = this;
	/*
	let af = obj.arcballcontrols.retrieveCurrentFocus();
	
	// Position, but also rotation need to be stored!!
	let cp = {
		position: obj.camera.position.clone(),
		rotation: obj.camera.rotation.clone()
	};
	
	
	return {
	  focus: af, 
	  camera: cp
	}
	*/
	return obj.arcballcontrols.getState();

  } // getVista
  
} // VistaManager




// These two work, just some easing still needs to be applied, and the vista should be stored in the database!


