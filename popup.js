var curPage;
var validLibs = 0;
$(document).ready(function(){
	//Check if last time search result saved?
	chrome.storage.local.get({'data':''},function(save){
		if(save.data!=''){
			refreshPage(save.data);
		}
	});
	//Bind the setting
	$('.icon-config').click(function(){
		if($('#config').length==1) return;

		var libCurrentConfigs = [];
		libCurrentConfigs = libCurrentConfigs.concat(libDefaultConfigs);


		$('#bookdetails').remove();
		$('#booklist').hide();
		$('body').data('orgheight', $('body').height());
		$('body').css('height',Number(libConfigs.length*20 + 60));
		$('body').append("<div id='config'></div>");
		//Config page
		libConfigs.forEach(function(i,ind){
			$('#config').append('<div class="configline"><span><input value=' + ind + ' type="checkbox"></span><span class="configname">'+i.name+'</span></div>');
			$('input:last').prop('checked',i.enable);
			$('input[type=checkbox]:last').click(function(){
				if($(this).prop('checked')) {
					libConfigs[$(this).attr('value')].enable = true;
				} else {
					libConfigs[$(this).attr('value')].enable = false;
				};
				//Save the Config
				var temp =[];
				libConfigs.forEach(function(i){
					temp.push(i.enable);
				});
				validLibs = 0;
				libConfigs.forEach(function(i){
					if(i.enable){
						validLibs++;
					};
				});
				chrome.storage.local.set({'libsetting':temp},function(){});
			});
		});
		$('#config').append('<div id="control-p"><span class="icon icon-return" title="返回"></span> <span class="author right">@iClaud</span> <span class="logo right">Reading is Power</span> </div>');
		$('.author').click(function(){
			chrome.tabs.create({url:"http://weibo.com/claudxiao"});
		});

		$('.icon-return').click(function(){
			$('#config').remove();
			$('body').css('height',$('body').data('orgheight'));
			$('#booklist').show();
		});
	});

	//Bind the clean
	$('.icon-clean').click(function(){
		$('#booklist').remove();
		$('#bookdetails').remove();
		$('#config').remove();
		$('body').css('height',40);
		chrome.storage.local.remove('data',function(){});
	});
	//Bind the search
	$('.icon-search').click(function(){
		if($('input').hasClass('busy')){
			return;
		};
		$('#booklist').remove();
		$('#bookdetails').remove();
		$('#config').remove();
		$('body').css('height',40);
		curPage = 0;
		//Judge
		var str =  $('#searchStr').val();
		if(str.length == 0) {
		} else {
			$('input').addClass('busy');
			$(this).removeClass('icon-search').addClass('icon-loadding');
			//encode the 
			$.get("http://book.douban.com/subject_search?search_text="+str+"&cat=1001"+"&start="+15*curPage,function(data) {
				refreshPage(data);
			});
		}
	});
	//Bind Key 
	//Enter - for search
	document.onkeydown=function(evt) {
		switch(evt.keyCode){
			case 13: //enter
				$('.icon-search').click();
				break;
			default:
		}
	}
});

function refreshPage(data) {
//chrome storage async function!
chrome.storage.local.set({'data': data}, function(){
	var stubDiv = $("<div></div>");
	stubDiv.html(data);
	var rList = stubDiv.find('.subject-item');
	var prevl = stubDiv.find('.prev link');
	var nextl = stubDiv.find('.next link');
	var bList = [];
	rList.each(function(i){
		var item = {};
		item.title = rList.eq(i).find('h2 a').text().replace(/[\r\n]/g,"").replace(/^\s*/g, "").replace(/\s*$/g,"").replace(/\s+/g," ");
		item.link = rList.eq(i).find('h2 a').attr('href'); 
		item.pub = rList.eq(i).find('.pub').text().replace(/[\r\n]/g,"").replace(/^\s*/g, "").replace(/\s*$/g,"").replace(/\s+/g," ");
		bList.push(item);
	});
	console.log(bList);
	$('body').css('height',Number(bList.length*26+120));

	$('input').removeClass('busy');
	$('.icon-loadding').removeClass('icon-loadding').addClass('icon-search');
	//show book list
	$('#booklist').remove();
	$('body').append("<div id='booklist'></div>");
	$('#booklist').append('<table id="bktable" style="width:320px;margin-top:15px;"></table>');
	bList.forEach(function(i){
		$('#bktable').append("<tr></tr>");
		$('tr:last').append("<td><div class='bookname' title='"+i.pub+"'></div></td>");
		$('.bookname:last').text(i.title);
		$('.bookname:last').data('info',i);
	});
	//Bind click item for book name
	$('.bookname').click(function(){
		if($('input').hasClass('busy')){
			return;
		};
		$('input').addClass('busy');
		var curBook = $(this).data('info');
		//load the page!
		$.get(curBook.link,function(book_data) {
			var stubDiv = $("<div></div>");
			stubDiv.html(book_data);
			var allinfo = stubDiv.find('#info ').text().replace(/[\r\n]/g," ");
			//Need Author
			curBook.author = stubDiv.find('#info span:first a').text();
			//Need Intro
			curBook.intro = stubDiv.find('.intro p').text();

			//Need ISBN
			curBook.ISBN = allinfo.replace(/.*ISBN:\s*(\d+).*/,"$1");
			//Need Rating
			curBook.rating = stubDiv.find('strong.rating_num').text().replace(/[\r\n]/g,"").replace(/^\s*/g,'').replace(/\s*$/g,'');
			curBook.rating = (curBook.rating=='')?'-':curBook.rating;
			//Need Pages
			if(allinfo.match(/页数:/)==null) {
				curBook.pages = '-';
			} else {
				curBook.pages = allinfo.replace(/.*页数:\s*(\d+).*/,"$1");
			}
			//Need Prize
			if(allinfo.match(/定价:/)==null) {
				curBook.prize = '-';
			} else {
				curBook.prize = allinfo.replace(/.*定价:\s*(\S+).*/,"$1");
			}
			//Need Year
			curBook.year = allinfo.replace(/.*出版年:\s*(\S+).*/,"$1");
			//Need Publisher
			if(allinfo.match(/出版社:/)==null) {
				curBook.publisher = '-';
			} else {
				curBook.publisher = allinfo.replace(/.*出版社:\s*(\S+).*/,"$1").replace(/\s+/g,' ');
			}
			//Need Sellers- Only judge if availabel
			curBook.sellers = (stubDiv.find('#buyinfo .buylink-price').length==0)?false:true;
			//Need Libs - Douban embeded;
			curBook.libdouban = (stubDiv.find('#borrowinfo').length==0)?false:true;
			//Need Cover 
			curBook.cover = stubDiv.find('#mainpic .nbg img').attr('src');
			//Need Libs - Chrary defined - ISBN based!;

			console.log(curBook);
			//Hide the list page -> show the book page
			$('#booklist').hide();
			$('#bookdetails').remove();
			$('body').append("<div id='bookdetails'></div>");
			$('body').css('height',Number(300));
			//Book Name
			$('#bookdetails').append('<div class="detailinfo title" title="'+curBook.title+'"><span>'+curBook.title+'<span></div>');
			$('#bookdetails').append('<img class="detailimg right" src="'+curBook.cover+'"></img>');
			$('#bookdetails').append('<div class="detailinfo" title="'+curBook.author+'"><span class="left label">作者</span><span>'+curBook.author+'</span></div>');
			//$('#bookdetails').append('<div class="detailinfo" title="'+curBook.publisher+'"> <span class="left label">出版</span><span>'+curBook.publisher+'</span></div>');
			$('#bookdetails').append('<div class="detailinfo" title="'+curBook.publisher+'"> <span class="left label">ISBN</span><span>'+curBook.ISBN+'</span></div>');
			$('#bookdetails').append('<div class="detailinfo"> <span class="left label">页数</span><span>'+curBook.pages+'</span></div>');
			$('#bookdetails').append('<div class="detailinfo"> <span class="left label">定价</span><span>'+curBook.prize+'</span></div>');
			if(curBook.sellers){
				$('#bookdetails').append('<div class="detailinfo"> <span class="left label">购买</span><span class="sellinfo" style="cursor:pointer;color:green;">'+"有效"+'</span></div>');
				$('.sellinfo').click(function(){
					chrome.tabs.create({url:curBook.link});
				});
			} else {
				$('#bookdetails').append('<div class="detailinfo"> <span class="left label">购买</span><span>'+"无效"+'</span></div>');
			}

			//Intro
				$('#bookdetails').append('<div class="introsec" title="'+curBook.intro.substr(0,200) +'...">'+curBook.intro.substring(0,75)+ '... </div>');

			//Lib
			if(curBook.libdouban){
				$('#bookdetails').append('<div class="detaillibinfo"> <span class="left label">豆瓣借书</span><span class="doubanlib" style="cursor:pointer;color:green;">'+"有效"+'</span></div>');
				$('.doubanlib').click(function(){
					chrome.tabs.create({url:curBook.link});
				});
			} else {
				$('#bookdetails').append('<div class="detaillibinfo"> <span class="left label">豆瓣借书</span><span>'+"无效"+'</span></div>');
			}

			//Customed Libs
//			if(curBook.libdouban){
//				$('#bookdetails .detaillibinfo:last').append('<span class="label" style="margin-left:100px;">扩展借书</span><span class="chrarylib" style="cursor:pointer;color:green;margin-left:10px;">'+"有效"+'</span>');
//				$('.chrarylib').click(function(){
//					chrome.tabs.create({url:curBook.link});
//				});
//			} else {
			$('#bookdetails .detaillibinfo:last').append('<span class="label" style="margin-left:100px;">扩展借书</span><span class="chrarylib" style="cursor:pointer;color:green;margin-left:10px;">'+"查找中"+'</span>');
//			}
			res = []; 	//reset the list

			libRes = '';
			//By Name
			//searchLibs({isbn:curBook.ISBN, title:curBook.title, type:'name'});
			//By ISBN
			searchLibs({isbn:curBook.ISBN, title:curBook.title, type:'ISBN'});

			$('.title').click(function(){
				chrome.tabs.create({url:curBook.link});
			});
			//Control
			$('#bookdetails').append('<div id="control-p"><span class="icon icon-return" title="返回"></span></div>');
			$('.icon-return').click(function(){
				$('#bookdetails').remove();
				$('body').css('height',Number(bList.length*26+120));
				$('#booklist').show();
			});
			
			$('input').removeClass('busy');
		});
	});
	//Insert Buttons
	$('#booklist').append('<div id="control-p"><span class="icon icon-prev" title="上一页"></span><span title="下一页" class="icon icon-next right"></span></div>');
	if(nextl.length==0) {
		$('.icon-next').addClass('icon-invalid');
	} else {
		$('.icon-next').data('link', nextl.attr('href'));
		$('.icon-next').click(function(){
			$('input').addClass('busy');
			$.get('http://book.douban.com' + $(this).data('link'),function(next_data) {
				refreshPage(next_data);
				$('input').removeClass('busy');
			});
		});
	}
	if(prevl.length==0) {
		$('.icon-prev').addClass('icon-invalid');
	} else {
		$('.icon-prev').data('link', prevl.attr('href'));
		$('.icon-prev').click(function(){
			$('input').addClass('busy');
			$.get('http://book.douban.com'+$(this).data('link'),function(prev_data) {
				refreshPage(prev_data);
				$('input').removeClass('busy');
			});
		});
	}

});

};


