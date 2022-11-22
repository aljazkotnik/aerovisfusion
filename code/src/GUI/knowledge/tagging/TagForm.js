import { html2element } from "../../../helpers.js";

import TagGeometryForm from "./TagGeometryForm.js";


let css = {
  button: `
    border: none;
	cursor: pointer;
	border-radius: 0px;
	background-color: LightGray;
	color: black;
  `,
  
  input: `
    border-radius: 0px;
    border: none;
    background-color: LightGray;
  `,
  
  iconbutton: `
    font-size: 11px;
  `
}; // css


let template = `
<div style="width: 300px">
  <div>
    <input class="username" type="text" placeholder="username" style="${css.input} width: 65px;"></input>

    <input class="tagname" type="text" placeholder="#tag-name" style="${css.input} width: 65px;"></input>
  
    <input class="tagvalue" type="text" placeholder="value" style="${css.input} width: 35px;"></input>
  
  </div>
  
  <div class="buttons" style="margin-top: 5px;">
      <button class="geom2d" style="${ css.button } ${css.iconbutton}">📐</button>
	  <button class="geom3d" style="${ css.button } ${css.iconbutton}">💡</button>
	  <button class="vista" style="${ css.button } ${css.iconbutton}">🔭</button>
      <button class="submit" style="${ css.button }">Submit</button>
  </div>
  
  <div class="subforms" style="margin-top: 5px;">
  </div>
  
  
</div>
`; // template


// This is more than the chapterform, it is the entirety of the forms.
export default class TagForm{
  
  constructor(renderer, scene, camera){
    let obj = this;
	obj.node = html2element(template);
	
	obj.userinput = obj.node.querySelector("input.username");
	obj.nameinput = obj.node.querySelector("input.tagname");
	obj.valueinput = obj.node.querySelector("input.tagvalue");
	obj.buttons = obj.node.querySelector("div.buttons");
	
	// This value will be overwritten during interactions, and is where the tag manager collects the time for the timestamps.
	obj.clear();
	// The button should cycle through black, green, and red. It will need some way of tracking its current state, and a way to load in existing tags! This will allow users to subsequently change the tag if needed? Maybe this is a bit much for now. It will need a submit button.
	// If the tag is loaded and the button switches to timestamping then any user can add the ned timesteps. Then the users name needs to be checked in addition. Maybe some way of filtering out the tags that are added? How would that work?
	// For now add 3 buttons. A starttime endtime and submit button. For the submit button only the start and name need to be filled in. The buttons must also show the selected times!
	
	
	obj.nameinput.onmousedown = function(e){
		e.stopPropagation()
	} // onmousedown
	
	
	// Update the form when the text is typed in to activate the submit button.
	obj.nameinput.oninput = function(){
		obj.update()
	} // oninput
	
	
	
	obj.submitButton = obj.node.querySelector("button.submit");
	obj.submitButton.onmousedown = function(e){
		e.stopPropagation();
		let tag = obj.tag;
		if(tag){
			obj.submit(tag);
			obj.clear()
		} // if
	} // onmousedown
	
	
	
	
	
	// Add in hte sub-forms.
	obj.volumetags = new TagGeometryForm(renderer, scene, camera);
	obj.node.querySelector("div.subforms").appendChild( obj.volumetags.node );
	obj.node.querySelector("button.geom3d").onclick = function(){
		obj.volumetags.toggle();
	} // onclick
	
	
  } // constructor
  

  
  update(){
	let obj = this;
	
	
	// The button is black by default, and making it look disabled is a bit more involved.
	let button = obj.node.querySelector("button.submit");
	if( obj.userinput.value && obj.nameinput.value ){
		// Enable.
		button.style.backgroundColor = "yellowgreen";
	} else {
		button.style.backgroundColor = "LightGray";
	} // if
  } // update
  
  clear(){
	let obj = this;
	obj.nameinput.value = "";
	obj.valueinput.value = "";
	obj.update();
  } // clear
  
  get author(){
	  let obj = this;
	  let author = obj.userinput.value;
	  if(!author){
		alert("You need to log in")
		return false;
	  } // if
	  return author;
  } // get author
  
  
  get tag(){
	// Chapter tag should belong to the task id so that the observations across multiple slices are available together to the user.
	let obj = this;
		
	
	// Geometry must be stringified ahead of the rest of hte object, otherwise the server side JSON.parse will turn it back into array, which will be converted into incorrect string for storage in SQL.
	let tag = { 
	    author: obj.author,
		name: obj.nameinput.value,
		value: obj.valueinput.value,
		geometry: JSON.stringify( obj.volumetags.geometry )
	} // tag
	
	
	return tag.author && tag.name ? tag : false; 
  } // tag

  // Is this necessary?? Or should we just use an outside method?
  // Placeholder for communication between classes.
  submit(tag){} // submit
} // TagForm