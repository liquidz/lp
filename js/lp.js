/* global variables */
var CURRENT_PAGE = 0;
var SLIDE_LENGTH = null;
var OPTIONS = {};

/* common func */
function elem(tag){
	return jQuery(document.createElement(tag));	
}
function p(text){
	return elem("p").text(text);
}

/* =Slide Class */
function Slide(title, page){
	this.title = title;
	this.page = page;
	this.body = new Array();
};
Slide.prototype = {
	add: function(obj){
		this.body.push(obj);
		return this;
	},
	
	to_s: function(){
		var box = elem("div");
		var main = elem("div");
		box.attr("id", "slide" + this.page);
		box.addClass("slide");
		main.addClass("main");
		main.append(elem("h2").text(this.title));

		jQuery.each(this.body, function(){
			main.append(this);
		});

		box.append(main);
		box.append(p(this.page).addClass("pager"));
		return box;
	}
};

/* =List Class */
function List(){
	this.active_flag = false;
	this.body = null;
	this.is_sub_list = false;
};
List.prototype = {
	sub_list: function(bool){
		this.is_sub_list = bool;
	},
	finish: function(){
		if(this.active_flag){
			this.active_flag = false;

			var tmp = this.body;
			this.body = null;
			return (this.is_sub_list) ? tmp.addClass("sublist") : tmp;
		}
		return null;
	},
	add: function(obj){
		if(!this.active_flag){
			this.body = elem("ul");
			this.active_flag = true;
		}
		this.body.append(obj);
	},
	is_active: function(){
		return this.active_flag;
	}
};

/* =parse_contents */
function parse_contents(cont){
	var list = new List();
	var page = null;
	var result = new Array();
	var page_count = 1;

	var lists = {};
	var last_level = 0;
	lists[0] = new List();

	var str = cont;
	while(str != ""){
		if(str.match(/^\=\s*(.+?)(\n|$)/)){
			// header

			/* リストを作成中だったら閉じる */
			if(lists[last_level].is_active()){
				for(var i = last_level; i > 0; --i){
					lists[i-1].add(lists[i].finish());
					lists[i] = null;
				}
				page.add(lists[0].finish());
				last_level = 0;
			}
			if(page != null) result.push(page);

			var title = RegExp.$1;
			var rest = RegExp.rightContext
			page = new Slide(title, page_count++);
			str = jQuery.trim(rest);
		} else if(str.match(/^(\*+)\s*(.+?)(\n|$)/)){
			// list
			var level = RegExp.$1.length - 1;
			var text = RegExp.$2;
			var rest = RegExp.rightContext;
			//document.write("kiteru?"+level+"<br>");

			if(level > last_level){
				lists[level] = new List();
				if(level > 0) lists[level].sub_list(true);
			} else if(level < last_level){
				lists[level].add(lists[last_level].finish());
				lists[last_level] = null;
			}
			lists[level].add(elem("li").text(text));

			last_level = level;

			str = jQuery.trim(rest);

			// $
			if(str == ""){
				for(var i = last_level; i > 0; --i){
					lists[i-1].add(lists[i].finish());
					lists[i] = null;
				}
				page.add(lists[0].finish());
			}
		} else if(str.match(/^\[\[([\s\S]+?)\]\](\n|$)/)){
			// code

			/* リストを作成中だったら閉じる */
			if(lists[last_level].is_active()){
				for(var i = last_level; i > 0; --i){
					lists[i-1].add(lists[i].finish());
					lists[i] = null;
				}
				page.add(lists[0].finish());
				last_level = 0;
			}

			var text = RegExp.$1;
			var rest = RegExp.rightContext;
			page.add(elem("div").addClass("code").append(elem("code").addClass("prettyprint").text(jQuery.trim(text))));
			str = jQuery.trim(rest);
		} else if(str.match(/^\%(.+?)(\n|$)/)){
			// option
			var text = RegExp.$1;
			var rest = RegExp.rightContext;

			var val = text.split("=");
			if(val.length == 2) OPTIONS[jQuery.trim(val[0])] = jQuery.trim(val[1]);
			str = jQuery.trim(rest);
		} else {
			// p

			/* リストを作成中だったら閉じる */
			if(lists[last_level].is_active()){
				for(var i = last_level; i > 0; --i){
					lists[i-1].add(lists[i].finish());
					lists[i] = null;
				}
				page.add(lists[0].finish());
				last_level = 0;
			}

			if(str.match(/(.+?)\n/)){
				var text = RegExp.$1;
				var rest = RegExp.rightContext;
				page.add(p(text));
				str = jQuery.trim(rest);
			} else {
				page.add(p(str));
				str = "";
			}
		}
	}
	result.push(page);

	return result;
}

/* =chage_page */
function change_page(pred_fn, move_fn){
	if(pred_fn(CURRENT_PAGE)){
		$("#slide" + CURRENT_PAGE).hide(500);
		CURRENT_PAGE = move_fn(CURRENT_PAGE);
		$("#slide" + CURRENT_PAGE).show(500);
	}
}
function next(){
	change_page(function(cp){ return cp < SLIDE_LENGTH; },
		function(cp){ return ++cp; });
}
function prev(){
	change_page(function(cp){ return cp > 0; },
		function(cp){ return --cp; });
}

/* =move_page */
function move_page(e){
	var mx = e.pageX;
	var w = $("#slide0").width();

	(mx < w/2) ? prev() : next();
}

/* =update_font_size */
function update_font_size(){
	var toc = $("#slide0");
	var title = $("#slide0 div.main h2")
	var font_size = (toc.width() * 4 / 5) / ((title.text().length > 10) ? title.text().length / 2 : title.text().length);
	font_size = (font_size > toc.height() / 10) ? toc.height() / 10 : font_size;
	$("h2").css("font-size", font_size + "px");
	$("body").css("font-size", font_size / 2 + "px");
}

/* =table_of_contents */
function table_of_contents(title, slides){
	var toc = new Slide(title, 0);
	var list = new List();

	// date
	var date = "";
	if(OPTIONS["date"]) date = OPTIONS["date"];
	// author
	var author = "";
	if(OPTIONS["author"]) author = OPTIONS["author"];
	var tmp = jQuery.trim(date + " " + author);
	if(tmp != "") toc.add(p(tmp).addClass("center"));

	// sections
	toc.add(p("Table of Contents"));
	jQuery.each(slides, function(){
		list.add(elem("li").text(this.title));
	});
	toc.add(list.finish());

	return toc.to_s();
}

/* =initialize */
function initialize(){
	// change font size
	update_font_size();

	// add events
	var w = $(window);
	w.bind("resize", update_font_size);
	w.bind("click", move_page);

	// set options
	var body = $("body");
	if(OPTIONS["bg"]) body.css("background", OPTIONS["bg"]);
	if(OPTIONS["fg"]) body.css("color", OPTIONS["fg"]);
}

/* =main */
$(function(){
	var title = $("head title").text();
	var body = $("body");
	var contents = jQuery.trim(body.text());

	/* clear body */
	body.text("");

	/* parse body text */
	var slides = parse_contents(contents);
	SLIDE_LENGTH = slides.length;

	/* add table of contents(page = 0) */
	body.append(table_of_contents(title, slides));

	/* add each slides(page = 1 - SLIDE_LENGTH)*/
	jQuery.each(slides, function(){
		body.append(this.to_s());
		$("#slide" + this.page).hide();
	});

	/* initialize */
	initialize();
	
	prettyPrint();
});

