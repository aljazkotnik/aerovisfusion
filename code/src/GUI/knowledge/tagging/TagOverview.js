import { html2element } from "../../../helpers.js";
import TagButton from "./TagButton.js";


// This should have a title also.
let template = `<div>
  <h3></h3>
  <div style="width: 300px; margin-top: 5px;">
</div>`;

export default class TagOverview{
  
  tags = [];
  buttons = [];
  needsupdating = [];
  tagClickFunction = function(){}
  
  constructor( title, tagClickFunction ){
    let obj = this;
	obj.node = html2element(template);
	
	// Set the new title
	obj.node.querySelector("h3").innerHTML = title;
	
	
	obj.tagClickFunction = tagClickFunction ? tagClickFunction : function(){};
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
		
		let b = new TagButton(tag, function(){ obj.tagClickFunction(tag) });
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