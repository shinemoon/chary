	var tableContent = "";
	var curBookName  = "请输入搜索关键字";
	//For Links
	var libLinks = new Array(); 
	//For setting 
	if(!localStorage['perpage']) localStorage['perpage'] = 5;
	if(!localStorage['ISBNFIRST']) localStorage['ISBNFIRST'] = 1;
