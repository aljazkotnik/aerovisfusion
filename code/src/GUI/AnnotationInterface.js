import { html2element } from "../helpers.js"; 


let template = `
<div>
    
  <div style="float: right;">
    <label style="color: white;">Range</label><input class="range" type="range" min="-1" max="1" value="0" step="0.05">
  </div>
    
  <br>
    
  <div style="float: right;">
    <label style="color: white;">Size</label><input class="size" type="range" min="-1" max="1" value="0" step="0.05">
  </div>
    
  <br>
	
  <div style="float: right;">
	<button class="icon remove">🧽</button>
  </div>
</div>
`;

//    <button class="icon add">🎯</button>
//	<button class="icon edit">🔧</button>


// This should control the aimSphereDistance and aimSphereRadius variables.
export default class AnnotationInterface{
	
  erase = false;
	
  constructor(){
	let obj = this;
	obj.node = html2element( template );
	
	// The inputs are used as controllers - -1 is negative and +1 is positive increment.
	obj.distanceInput = obj.node.querySelector("input.range");
	obj.radiusInput = obj.node.querySelector("input.size");
	
	obj.distanceInput.addEventListener("mouseout", function(){obj.distanceInput.value = 0;});
	obj.distanceInput.addEventListener("mouseup", function(){obj.distanceInput.value = 0;});
	obj.radiusInput.addEventListener("mouseout", function(){obj.radiusInput.value = 0;});
	obj.radiusInput.addEventListener("mouseup", function(){obj.radiusInput.value = 0;});

	
	// The buttons for handling annotation spheres.
	obj.removeSphereButton = obj.node.querySelector("button.remove");
	
	
	obj.removeSphereButton.onclick = function(){
		// Toggle the button, and change its appearance.
		obj.erase = !obj.erase;
		obj.removeSphereButton.style.border = `2px solid ${ obj.erase ? "gainsboro" : "black" }`;
	} // onclick
	
  } // constructor
  
  
  
  
  get sphereDistance(){
	return Number(this.distanceInput.value);
  } // aimSphereDistance
  
  get sphereRadius(){
	return Number(this.radiusInput.value);
  } // aimSphereRadius
  
} // AnnotationInterface