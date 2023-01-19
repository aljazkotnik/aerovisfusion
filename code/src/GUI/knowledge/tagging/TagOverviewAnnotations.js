import { html2element } from "../../../helpers.js";
import TagButton from "./TagButton.js";
import Tag3DGeometryButton from "./Tag3DGeometryButton.js";

let template = `<div>
  <b style="margin-bottom: 0px;"></b>
  <div style="width: 300px;">
</div>`;

export default class TagOverviewAnnotations{
  
  tags = [];
  buttons = [];
  needsupdating = [];
  
  constructor(title, scene, camera){
    let obj = this;
	obj.node = html2element(template);
	
	// Set the new title
	obj.node.querySelector("b").innerHTML = title;
	
	obj.scene = scene;
	obj.camera = camera;
	// The tag visualisation should happen here also.
  } // constructor
  
  add(newtags){
	let obj = this;
	newtags.forEach(t=>obj.tags.push(t));
	
	
	let newbuttons = newtags.map(tag=>{
		let b = new Tag3DGeometryButton(tag, obj.scene, obj.camera);
		obj.needsupdating.push(b.annotation);
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
  
  
} // TagOverviewAnnotations