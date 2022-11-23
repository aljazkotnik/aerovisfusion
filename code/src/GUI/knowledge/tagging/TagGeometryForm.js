import { html2element } from "../../../helpers.js";
import VolumeAnnotation from "./VolumeAnnotation.js";
import * as THREE from "three";


/*
This interface should be positioned left, it should have a form on the top, and the comments below.
*/

let css = {
  iconbutton: `
    cursor: pointer;
    color: LightGray;
    font-size: 14px;
  `
}; // css


let template = `
<div style="display: none;">
  <div>
    <button class="icon place" style="${ css.iconbutton }">Place📌</button>
	<button class="icon edit" style="${ css.iconbutton }">Edit🔧</button>
	<button class="icon remove" style="${ css.iconbutton }">Erase🧽</button>
  </div>
  <div class="editmenu" style="display: none;">
	<table>
	  <tr>
		<th>Depth</th>
		<td>
		  <input class="range" type="range" min="-1" max="1" value="0" step="0.05">
		</td>
	  </tr>
	  <tr>
		<th>Size</th>
		<td>
		  <input class="size" type="range" min="-1" max="1" value="0" step="0.05">
		</td>
	  </tr>
	</table>
  </div>
</div>
`;

//    <button class="icon add">🎯</button>
//	<button class="icon edit">🔧</button>


/*
This will be a subform of the commenting, and will only appear when the correct button is pressed.
*/
export default class TagGeometryForm{
	
	
	
  buttonSelected = "";
  scale = 0.1;
	
  constructor(renderer, scene, camera){
	let obj = this;
	obj.node = html2element( template );
	
	
	// Buttons that control hte annotation creation/editing/removal modes.
	obj.placeSphereButton = obj.node.querySelector("button.place");
	obj.editSphereButton = obj.node.querySelector("button.edit");
	obj.removeSphereButton = obj.node.querySelector("button.remove");
	
	function toggleButton(name){
		// Toggle the button, and change its appearance.
		obj.buttonSelected = obj.buttonSelected==name ? "" : name;
		
		let a = [obj.buttonSelected=="place",obj.buttonSelected=="edit",obj.buttonSelected=="remove"]
		obj.placeSphereButton.style.border = `2px solid ${ a[0] ? "gainsboro" : "black" }`;
		obj.editSphereButton.style.border = `2px solid ${ a[1] ? "gainsboro" : "black" }`;
		obj.removeSphereButton.style.border = `2px solid ${ a[2] ? "gainsboro" : "black" }`;
		
		obj.node.querySelector("div.editmenu").style.display = obj.buttonSelected=="edit" ? "" : "none";
	} // toggleButtons

	obj.placeSphereButton.onclick  = function(){ toggleButton("place")   } // onclick
	obj.editSphereButton.onclick   = function(){ 
	    toggleButton("edit");
		
		let sphere = obj.annotations.selected[0];
		if(obj.buttonSelected=="edit" && sphere){
			obj.makeSphereDraggable(sphere);
		} // if
	} // onclick
	obj.removeSphereButton.onclick = function(){ toggleButton("remove") } // onclick
	
	
	
	
	
	
	
	// The inputs are used as controllers - -1 is negative and +1 is positive increment.
	obj.distanceInput = obj.node.querySelector("input.range");
	obj.radiusInput = obj.node.querySelector("input.size");
	
	
	// Add functionality
	obj.distanceInput.addEventListener("mouseout", function(){obj.distanceInput.value = 0;});
	obj.distanceInput.addEventListener("mouseup", function(){obj.distanceInput.value = 0;});
	
	obj.radiusInput.addEventListener("mouseout", function(){obj.radiusInput.value = 0;});
	obj.radiusInput.addEventListener("mouseup", function(){obj.radiusInput.value = 0;});


	
	
	
	// Allow adjusting the sphere radius.
	obj.radiusInput.addEventListener("input", function(e){
		// Change the radius of the currently selected sphere.
		
		let ds = Number(obj.radiusInput.value)/50;
		obj.annotations.selected.forEach(sphere=>{
			sphere.scale.addScalar( ds );
			obj.scale = sphere.scale.x;
		})
	}) // addEventListener

	obj.distanceInput.addEventListener("input", function(e){
		// Add a vector to the sphere. The vector should go from the camera point through the center of the sphere.
		
		let v = Number(obj.distanceInput.value);
		obj.annotations.selected.forEach(sphere=>{
			let p = sphere.position;
			
			let x = p.x + 0.01*v*( p.x - camera.position.x );
			let y = p.y + 0.01*v*( p.y - camera.position.y );
			let z = p.z + 0.01*v*( p.z - camera.position.z );
			
			sphere.position.set(x,y,z);
		}) // forEach
		
	}) // addEventListener
	
	
	
	
	
	
	
	
	// Actual annotations;
	obj.annotations = new VolumeAnnotation(camera);
	console.log(obj.annotations)
	

	obj.pointer = new THREE.Vector2();
	obj.scene = scene;
	obj.camera = camera;
	obj.raycaster = new THREE.Raycaster();
	
	
	// The annotations are added to the group, which is already a child of the scene.
	obj.scene.add(obj.annotations.group);
	
	
	
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
			switch(obj.buttonSelected){
				case "place":
				    obj.placeVolumeAnnotation();
					break;
				case "edit":
				    // Select a new sphere to edit.
					obj.selectVolumeAnnotation();
					break;
				case "erase":
				    obj.eraseVolumeAnnotation();
				    break;
			} // switch
			
		} // if
	}) // addEventListener
	
	
  } // constructor

  
  
  
  
  toggle(active){
	  let obj = this;
	  let current = obj.node.style.display;
	  obj.node.style.display = active!=undefined ? active : (current=="none" ? "" : "none");
  } // toggle
  
  
  
  placeVolumeAnnotation(){
	  // Attempt to place a volume annotation for an on-screen click event e.
	  let obj = this;
	  
	  // How to place the geometry in freestream without any geometry.
	  // Place on a xy plane going through the domain midpoint?
	  let p = obj.returnFirstIntersection();
	  if(p){
		let addedSphere = obj.annotations.add(p.point.x, p.point.y, p.point.z, obj.scale);
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
  
  
  get geometry(){
	  // The geometry should only be added if the form is maximised? Should toggling wipe the form? 
	  let obj = this;
	  return obj.annotations.geometry;
  } // get tagGeometry
  
  
  
  
  
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
  
  
  
  
  
  
  
  makeSphereDraggable(){} // makeSphereDraggable
  
  
  
} // TagGeometryForm


function mouseEventMovementDistanceSquared(origin,finish){
	return (origin.clientX - finish.clientX)**2 + (origin.clientY - finish.clientY)**2;
} // mouseEventMovementDistanceSquared