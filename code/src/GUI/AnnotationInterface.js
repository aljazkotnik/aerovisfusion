import { html2element } from "../helpers.js"; 


let template = `
<div">
    
  <div style="float: right;">
    <label style="color: white;">Range</label><input class="range" type="range">
  </div>
    
  <br>
    
  <div style="float: right;">
    <label style="color: white;">Size</label><input class="size" type="range">
  </div>
    
</div>
`;


// This should control the aimSphereDistance and aimSphereRadius variables.
export default class AnnotationInterface{
  constructor(){
	let obj = this;
	obj.node = html2element( template );
	
	// Default range for the sliders is 0 - 100. How should the setting of min and max be made?
	obj.aimSphereDistanceInput = obj.node.querySelector("input.range");
	obj.aimSphereRadiusInput = obj.node.querySelector("input.size");
	
	
	
  } // constructor
  
  aimSphereDistanceConfig(min,max,val){
	let obj = this;
	obj.aimSphereDistanceInput.min = min;
	obj.aimSphereDistanceInput.max = max;
	obj.aimSphereDistanceInput.value = val;
	obj.aimSphereDistanceInput.step = (max - min)/100;
  } // aimSphereDistanceConfig
  
  aimSphereRadiusConfig(min,max,val){
	// Can't change the radius after it's been created, but the geometry can be multiplied by a scalar.
	let obj = this;
	obj.aimSphereRadiusInput.min = min;
	obj.aimSphereRadiusInput.max = max;
	obj.aimSphereRadiusInput.value = val;
	obj.aimSphereRadiusInput.step = (max - min)/100;
  } // aimSphereRadiusInput
  
  
  get aimSphereDistance(){
	return Number(this.aimSphereDistanceInput.value);
  } // aimSphereDistance
  
  get aimSphereRadius(){
	return Number(this.aimSphereRadiusInput.value);
  } // aimSphereRadius
  
} // AnnotationInterface