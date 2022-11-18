import { html2element } from "../../../helpers.js";
import Comment from "./Comment.js";

export default class ReplyComment extends Comment{
  constructor(config){
    super(config)
	let obj = this;
	
	// The secondary comments need to be indented.
	obj.node.style.marginLeft = "20px";
	
	// Replies can't be replied to. Maybe allow them too, but just put a hashtagged name in front?
	obj.node.querySelector("button.reply").remove();
	
  } // constructor
} // ReplyComment