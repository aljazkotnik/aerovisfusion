import { html2element } from "../../../helpers.js";
import TagButton from "./TagButton.js";
import Tag3DGeometryButton from "./Tag3DGeometryButton.js";

let template = `<div style="width: 300px; margin-top: 5px;"></div>`;

export default class TagOverview{
  
  tags = [];
  buttons = [];
  needsupdating = [];
  
  constructor(scene, camera){
    let obj = this;
	obj.node = html2element(template);
	obj.scene = scene;
	obj.camera = camera;
	// The tag visualisation should happen here also.
  } // constructor
  
  add(newtags){
	let obj = this;
	newtags.forEach(t=>obj.tags.push(t));
	
	
	let newbuttons = newtags.map(tag=>{
		// If the tag has geometry with points with 4 components then its a 3D volume geometry.
		// Or should a type be simply prescribed?
		let n = 0;
		if(tag.geometry){
			tag.geometry = JSON.parse( tag.geometry );
			n = tag.geometry[0] ? tag.geometry[0].length : 0;
		} // if
		
		let b;
		switch(n){
			case 4:
			    b = new Tag3DGeometryButton(tag, obj.scene, obj.camera);
				obj.needsupdating.push(b.annotation);
				break;
			default:
				b = new TagButton(tag);
		} // switch
	
		return b
	}) // map
	
	
	newbuttons.forEach(b=>{
	  obj.buttons.push(b);
	  obj.node.appendChild(b.node);
	}) // forEach
  } // add
  
  namevalid(name){
	// If any existing tag has this name the name is not valid.
	let obj = this;
	return !obj.tags.some(tag=>tag.name == name)
  } // namevalid
  
  
  purge(){
	let obj = this;
	obj.tags = [];
	obj.buttons.forEach(b=>b.node.remove());
	obj.buttons = [];
  } // purge
  
  
  
  update(){
	  // Launch update of all the annotation spheres.
	  let obj = this;
	  obj.needsupdating.forEach(a=>{
		  a.update();
	  })
  } // update
  
  
} // TagOverview