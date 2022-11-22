import TagButton from "./TagButton.js";
import VolumeAnnotation from "./VolumeAnnotation.js";

export default class Tag3DGeometryButton extends TagButton{
	constructor(tag, scene, camera){
		super(tag);
		let obj = this;
		
		
		// VolumeAnnotation requires camera to update the glow.
		obj.annotation = new VolumeAnnotation( camera );
		scene.add(obj.annotation.group);
		
		obj.tag.geometry.forEach(g=>{
			obj.annotation.add(...g);
		}) // forEach
		obj.annotation.hide();
		
		
		obj.node.onmouseenter = function(e){
			obj.annotation.show();
		} // onmousein
		
		obj.node.onmouseleave = function(e){
			obj.annotation.hide();
		} // onmousein
		
	} // constructor
} // Tag3DGeometryButton