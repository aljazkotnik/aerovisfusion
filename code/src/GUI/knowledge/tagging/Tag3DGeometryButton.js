import TagButton from "./TagButton.js";
import VolumeAnnotation from "./VolumeAnnotation.js";


// Adjust so that mouse down keeps the annotation on-screen, and the button reflects this too. Maybe work on picking a random color for the sphere also? Has to work somehow, if the colors can change depending on active status.
export default class Tag3DGeometryButton extends TagButton{
	constructor(tag, scene, camera){
		super(tag);
		let obj = this;
		
		
		// VolumeAnnotation requires camera to update the glow.
		obj.annotation = new VolumeAnnotation( camera );
		scene.add(obj.annotation.group);
		
		obj.tag.geometry.forEach(sc=>{
			obj.annotation.add(sc);
		}) // forEach
		obj.annotation.hide();
		
		
		obj.node.onmouseenter = function(e){
			obj.annotation.show();
		} // onmousein
		
		obj.node.onmouseleave = function(e){
			// If the button is turned on, then it shouldn't be turned off here.
			if(!obj.on){
				obj.annotation.hide();
			}
		} // onmousein
		
	} // constructor
} // Tag3DGeometryButton