var res = [];
var busyflags=0;
var nameLinkArray = []; //Used for name search
var libRes = '';

//Config Static Parameters

var libDefaultConfigs = [
	//杭州图书馆
	{name:'杭州市图书馆', enable:true },
	{name:'首都图书馆', enable:false }
];

var libConfigs = [];
libConfigs = libConfigs.concat(libDefaultConfigs);

chrome.storage.local.get({'libsetting':[true]},function(setting){
	var loadCfg = setting.libsetting;
	libConfigs.forEach(function(i,ind){
		if(typeof(loadCfg[ind])=='undefined'){
			i.enable = false;
		} else {
			i.enable = loadCfg[ind];
		}
	});
	validLibs = 0;
	libConfigs.forEach(function(i){
		if(i.enable){
			validLibs++;
		};
	});
});

function searchLibs(curBook) {
	busyflags = validLibs;
	libConfigs.forEach(function(i){
		if(i.enable){
			searchLib(i.name,[curBook.isbn,curBook.title],curBook.type);
		};
	});
	if(busyflags==0) {
		busyflags = 1;
		checkLibBusy();
	}
}

function searchLib(libname, criterion, type) {
	var mres = null;
	var stubDiv = $("<div></div>");
	//for libs:
	switch (libname){
	//杭州市图书馆
		case '杭州市图书馆':{
			var searchISBNUrl;
			var searchNameUrl;
			searchISBNUrl = "http://my1.hzlib.net/opac3/search?rows=10&hasholding=1&searchWay0=marc&q0=&logical0=AND&q="+criterion[0]+"&searchWay=isbn&searchSource=reader";
			searchNameUrl = "http://my1.hzlib.net/opac3/search?q="+criterion[1]+"&searchType=standard&isFacet=true&view=standard&searchWay=title&rows=10&sortWay=score&sortOrder=desc&hasholding=1&searchWay0=marc&q0=&logical0=AND&f_curlibcode=0000";

			//search based on names:
			var Url = (type=='ISBN')?searchISBNUrl:searchNameUrl;
			$.get(Url, function(data){
				stubDiv.html(data);
				console.log(stubDiv.find('#search_meta').text());
				mres = stubDiv.find('#search_meta').text().match(/检索到.*?(\d\S*).*/);
				if(mres!=null && mres[1]!='0' ) res.push({lib:'杭州市图书馆',count:mres[1],link:searchISBNUrl}); 
				else nameLinkArray.push({nameLink:searchNameUrl});
				checkLibBusy();
			});
			break;
		};
	//首都图书馆
		case '首都图书馆':{
			var searchISBNUrl;
			var searchNameUrl;
			//Refine ISBN id
			var ISBNraw = criterion[0];
			var ISBNnew = criterion[0].substr(0,3) + "-" + criterion[0].substr(3,1) + "-"  +criterion[0].substr(4,4) + "-" + criterion[0].substr(8,4) + "-" + criterion[0].substr(12,1);
			//Sorry Shoutu handle the ISBN in very strange way, I can't do it, then only use Name for that
			//searchISBNUrl = "http://123.127.171.216:8080/clcnopac/Search.action?book_isbn="+ISBNnew+"&pageSize=undefined&keyword1=978-7-5605-3975-1&nameway=1&factfalg=4";
			searchISBNUrl = "http://123.127.171.216:8080/clcnopac/Search.action?book_name="+criterion[1]+"&pageSize=30&keyword1="+criterion[1]+"&nameway=1&factfalg=1";
			searchNameUrl = "http://123.127.171.216:8080/clcnopac/Search.action?book_name="+criterion[1]+"&pageSize=30&keyword1="+criterion[1]+"&nameway=1&factfalg=1";
			
			//search based on names:
			var Url = (type=='ISBN')?searchISBNUrl:searchNameUrl;
			$.get(Url, function(data){
				stubDiv.html(data);
				console.log(stubDiv.find('#search_info').text());
				mres = stubDiv.find('#search_info').text().match(/共有: .*?(\d\S*)条.*/);
				if(mres!=null && mres[1]!='0' ) res.push({lib:'首都图书馆',count:mres[1],link:searchISBNUrl}); 
				else nameLinkArray.push({nameLink:searchNameUrl});
				checkLibBusy();
			});
			break;
		};

	//浙江图书馆
		default:
	}
}

function checkLibBusy(){
	busyflags--;
	if(busyflags==0){
		if(res.length>0){
			$('.chrarylib').text('有馆藏');
			var titleStr = '';
			var linkArray = [];
			res.forEach(function(i){
				titleStr = titleStr + i.lib + ":" + i.count +"\n";
				linkArray.push(i.link);
			});
			titleStr = titleStr.substring(0,titleStr.length-1); //remove return

			libRes = libRes + titleStr;
			
			$('.chrarylib').attr('title',libRes);
			$('.chrarylib').data('links',linkArray);
			$('.chrarylib').addClass('available');
			$('.chrarylib.available').click(function(){
				var links = $(this).data('links');
				console.log(links);
				links.forEach(function(i){
					chrome.tabs.create({url:i});
				});
			});
		} else {
			$('.chrarylib').text('无馆藏').attr('title','请点击进行同名书籍查询或者模糊查询');
			$('.chrarylib').data('namelinks',nameLinkArray);
			$('.chrarylib').addClass('available');
			$('.chrarylib.available').click(function(){
				nameLinkArray.forEach(function(i){
					chrome.tabs.create({url:i.nameLink});
				});
			});

		}
	}
}
