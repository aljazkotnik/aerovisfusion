import { html2element } from "../helpers.js";
import Stats from "stats.js";
import AnnotationInterface from "./AnnotationInterface.js";


let template = `
<div>
  <div class="stats"></div>
  <div class="annotationcontrols" style="float: right; position: absolute; right: 10px;"></div>
</div>
`;


export default class HUD{
	constructor(){
		let obj = this;
		obj.node = html2element(template);
		
		// Add the Stats object.
		obj.stats = new Stats();
		obj.stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
		obj.node.querySelector("div.stats").appendChild( obj.stats.dom )
		
		// Add the annotation interface.
		obj.aui = new AnnotationInterface();
		obj.node.querySelector("div.annotationcontrols").appendChild( obj.aui.node );
	} // constructor
} // HUD