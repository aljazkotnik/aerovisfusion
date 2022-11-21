import { html2element } from "../../../helpers.js";
import VolumeAnnotation from "./VolumeAnnotation.js";
import * as THREE from "three";


/*
This interface should be positioned left, it should have a form on the top, and the comments below.
*/

let template = `
<table style="display: none;">
  <tr>
    <th>Depth</th>
    <td>
      <input class="range" type="range" min="-1" max="1" value="0" step="0.05">
    </td>
    <td rowspan="2"><button class="icon remove">🧽</button></th>
  </tr>
  <tr>
    <th>Size</th>
    <td>
      <input class="size" type="range" min="-1" max="1" value="0" step="0.05">
    </td>
  </tr>
</table>
`;

//    <button class="icon add">🎯</button>
//	<button class="icon edit">🔧</button>


/*
This will be a subform of the commenting, and will only appear when the correct button is pressed.
*/
export default class TagGeometryForm{
	
	
	
  erase = false;
	
  constructor(renderer, scene, camera){
	let obj = this;
	obj.node = html2element( template );
	
	// The inputs are used as controllers - -1 is negative and +1 is positive increment.
	obj.distanceInput = obj.node.querySelector("input.range");
	obj.radiusInput = obj.node.querySelector("input.size");
	obj.removeSphereButton = obj.node.querySelector("button.remove");
	
	
	// Add functionality
	obj.distanceInput.addEventListener("mouseout", function(){obj.distanceInput.value = 0;});
	obj.distanceInput.addEventListener("mouseup", function(){obj.distanceInput.value = 0;});
	
	obj.radiusInput.addEventListener("mouseout", function(){obj.radiusInput.value = 0;});
	obj.radiusInput.addEventListener("mouseup", function(){obj.radiusInput.value = 0;});

	obj.removeSphereButton.onclick = function(){
		// Toggle the button, and change its appearance.
		obj.erase = !obj.erase;
		obj.removeSphereButton.style.border = `2px solid ${ obj.erase ? "gainsboro" : "black" }`;
	} // onclick
	
	
	
	
	// Actual annotations;
	obj.annotations = new VolumeAnnotation(camera);
	

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
			obj.placeVolumeAnnotation();
		} // if
	}) // addEventListener
	
	
  } // constructor
  
  
  
  
  get sphereDistance(){
	return Number(this.distanceInput.value);
  } // aimSphereDistance
  
  get sphereRadius(){
	return Number(this.radiusInput.value);
  } // aimSphereRadius
  
  
  
  
  toggle(active){
	  let obj = this;
	  let current = obj.node.style.display;
	  obj.node.style.display = active!=undefined ? active : (current=="none" ? "" : "none");
  } // toggle
  
  
  
  placeVolumeAnnotation(){
	  // Attempt to place a volume annotation for an on-screen click event e.
	  let obj = this;
	  
	  
	  // First deselect all other annotations.
	  obj.annotations.select([]);
	  
	  
	  
	  // How to place the geometry in freestream without any geometry.
	  // Place on a xy plane going through the domain midpoint?
	  let p = obj.returnFirstIntersection();
	  if(p){
		obj.annotations.add(p.point.x, p.point.y, p.point.z, 0.1);	    
	  } else {
		// No intersection was found, but an annotation should still be placed.
		console.log("Place annotation in freestream.")
		
		// How to place annotation on streamlines??
	  } // if
	  
	  
  } // placeVolumeAnnotation
  
  
  get tagGeometry(){
	  // The geometry should only be added if the form is maximised? Should toggling wipe the form? 
	  let obj = this;
	  return "[[0,0]]"
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
  
  
  
} // TagGeometryForm


function mouseEventMovementDistanceSquared(origin,finish){
	return (origin.clientX - finish.clientX)**2 + (origin.clientY - finish.clientY)**2;
} // mouseEventMovementDistanceSquared