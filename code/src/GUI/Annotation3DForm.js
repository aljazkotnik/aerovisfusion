
import * as THREE from "three";
import VolumeAnnotation from "./knowledge/tagging/VolumeAnnotation.js";


export default class Annotation3DForm{
  constructor(lilguimenu, renderer, scene, camera){
    let obj = this;
	
	obj.tag = {
		name: "",
	}
	
	
	// Geometry could be adapted to send otehr data as well, such as the different axis scales.
	obj.config = {
		place: false,
		erase: false,
		position: false,
		scale: 0.1,
		submit: function(){
			obj.geometry = JSON.stringify( obj.annotations.geometry );
			obj.send(obj.tag);
			obj.clear();
		}
	} // tagFormConfig
	
	
	obj.controllers = {};
	
	obj.controllers.name = lilguimenu.add( obj.tag , "name")
	
	obj.controllers.place = lilguimenu.add( obj.config , "place").name("Place📌")
	obj.controllers.position = lilguimenu.add( obj.config , "position").name("Position")
	obj.controllers.scale = lilguimenu.add( obj.config , "scale").name("Scale")
	obj.controllers.erase = lilguimenu.add( obj.config , "erase").name("Erase🧽")
	obj.controllers.submit = lilguimenu.add( obj.config , "submit")
	
	
	obj.activate();
	
	
	
	
	obj.controllers.name.onChange(function(v){ obj.activate() })
	
	
	
	// Ensure that only one tickbox is active at a time.
	obj.controllers.place.onChange(function(v){ obj.coordinate(0, v) })
	obj.controllers.position.onChange(function(v){ obj.coordinate(1, v) })
	obj.controllers.erase.onChange(function(v){ obj.coordinate(2, v) })
	
	
	
	
	
	
	// Actual annotations;
	obj.annotations = new VolumeAnnotation(camera);
	scene.add( obj.annotations.group )

	obj.pointer = new THREE.Vector2();
	obj.scene = scene;
	obj.camera = camera;
	obj.raycaster = new THREE.Raycaster();
	
	
	
	renderer.domElement.addEventListener( "mousemove", function(e){
		obj.pointer.x = ( e.clientX / window.innerWidth ) * 2 - 1;
		obj.pointer.y = - ( e.clientY / window.innerHeight ) * 2 + 1;
	}); // onPointerMove
	
	
	// To work with panning etc the annotation adding is disabled when the mouse moves a sufficient distance.
	var mouseDownEvent
	renderer.domElement.addEventListener("mousedown", function(e){
		mouseDownEvent = e;
	}) // addEventListener

	
	renderer.domElement.addEventListener("mouseup", function(e){
	
		// Has the mouse moved since mousedown?
		if(mouseEventMovementDistanceSquared(mouseDownEvent, e) < 1){
			e.preventDefault();
			
			// How to switch between hte currently active annotation spheres? Longpress? Or should there be an adjust button that brings out the sliders? And a place button that allows annotation adding to be disabled?
			
			// check which tickboxes are active and execute.
			if( obj.controllers.place.getValue() ){ 
				obj.placeVolumeAnnotation();
				obj.activate();
			} // if
			if( obj.controllers.position.getValue() ){ obj.selectVolumeAnnotation(); } // if
			if( obj.controllers.erase.getValue() ){ obj.eraseVolumeAnnotation();
				obj.activate();
			 } // if
			
		} // if
	}) // addEventListener
	
	
	
  } // constructor
  
  
  coordinate(i,v){
	let obj = this;
	obj.config.place = i==0 ? v : false;
	obj.config.position = i==1 ? v : false;
	obj.config.erase = i==2 ? v : false;
	
	obj.controllers.place.updateDisplay();
	obj.controllers.position.updateDisplay();
	obj.controllers.erase.updateDisplay();
	
	obj.changeTransformObject( obj.config.position )
  } // coordinate
  
  
  
  placeVolumeAnnotation(){
	  // Attempt to place a volume annotation for an on-screen click event e.
	  let obj = this;
	  
	  // How to place the geometry in freestream without any geometry.
	  // Place on a xy plane going through the domain midpoint?
	  let p = obj.returnFirstIntersection();
	  if(p){
		let addedSphere = obj.annotations.add(p.point.x, p.point.y, p.point.z, obj.config.scale);
		obj.annotations.select([addedSphere]);		
	  } else {
		// No intersection was found, but an annotation should still be placed.
		console.log("Place annotation in freestream.")
		
		// How to place annotation on streamlines??
	  } // if
	  
	  
  } // placeVolumeAnnotation
  
  
  selectVolumeAnnotation(){
	   let obj = this;
	  
	  // How to place the geometry in freestream without any geometry.
	  // Place on a xy plane going through the domain midpoint?
	  let p = obj.returnFirstIntersection();
	  if(p.object.name=="AnnotationSphere"){
		// First deselect all other annotations.
	    obj.annotations.select([p.object]);
	  } // if
	  
	  
	  // The positioning tools should respond.
	  obj.changeTransformObject( obj.config.position );
	  
	  
  } // selectVolumeAnnotation
  
  
  eraseVolumeAnnotation(){
	  let obj = this;
	  
	  // First deselect all other annotations.
	  obj.annotations.select([]);
	  
	  
	  // How to place the geometry in freestream without any geometry.
	  // Place on a xy plane going through the domain midpoint?
	  let p = obj.returnFirstIntersection();
	  if(p.object.name=="AnnotationSphere"){
		obj.annotations.remove( [p.object] );	    
	  } // if
  } // eraseVolumeAnnotation
  
  
  returnFirstIntersection(){
	// Maybe adjust this so that if an intersection with correct objects is not found, the intersection with a plane of interest is found. 
	// But what happens if we're looking away from the center of the domain?
	let obj = this;
	obj.raycaster.setFromCamera( obj.pointer, obj.camera );
	
	let meshes = obj.scene.children.filter(child=>child.type=="Mesh");
	let groups = obj.scene.children.filter(child=>child.type=="Group")
	  .reduce((acc,child)=>{return acc.concat(child.children)},[]).filter(child=>child.type=="Mesh");
	
	let intersects = obj.raycaster.intersectObjects( meshes.concat(groups), false );
	return intersects[0];
  } // returnFirstIntersection
  
  
  
  
  // Dummy function.
  changeTransformObject(v){}
  
  
  
  
  send(tag){
	  // Dummy function.
  } // send
  
  clear(){
	  let obj = this;
	  obj.tag.name = ""
  } // clear
  
  
  activate(){
	  let obj = this;
	  obj.controllers.submit.enable( obj.tag.name && obj.annotations.geometry.length > 0 );
  } // activate
  
} // Annotation3DForm



function mouseEventMovementDistanceSquared(origin,finish){
	return (origin.clientX - finish.clientX)**2 + (origin.clientY - finish.clientY)**2;
} // mouseEventMovementDistanceSquared