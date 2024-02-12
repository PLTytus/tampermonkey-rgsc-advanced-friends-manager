// ==UserScript==
// @name            RGSC Advanced Friends Manager
// @author          PLTytus
// @version         2.4.2
// @namespace       http://gtaweb.eu/tampermonkey
// @downloadURL     https://bitbucket.org/PLTytus/rgsc-advanced-friends-manager/raw/master/rgsc_advanced_friends_manager.user.js
// @updateURL       https://bitbucket.org/PLTytus/rgsc-advanced-friends-manager/raw/master/rgsc_advanced_friends_manager.meta.js
// @match           https://*.socialclub.rockstargames.com/*
// @match           https://socialclub.rockstargames.com/*
// @resource        CSS1 https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css
// @resource        CSS2 https://bitbucket.org/PLTytus/rgsc-advanced-friends-manager/raw/master/src/rgsc_advanced_friends_manager.css
// @grant           GM_getResourceText
// @grant           GM_addStyle
// @grant           GM_xmlhttpRequest
// @require         http://code.jquery.com/jquery-1.12.4.min.js
// @require         http://code.jquery.com/ui/1.12.1/jquery-ui.js
// ==/UserScript==

(function() {
    'use strict';

    const css1 = GM_getResourceText("CSS1");
    const css2 = GM_getResourceText("CSS2");
    GM_addStyle(css1);
    GM_addStyle(css2);

    var TPLC = 197881;
    var AkwizytorkaRID = 165618456;
    var sleepTimes = [0, 0, 5, 10, 15, 20, 30, 45, 60];
    // var snd = new Audio("https://gtaweb.eu/_sources/ringtones/Alarm%201.mp3");
    var getHisFr = [];
    // snd.loop = false;
    // snd.autoplay = false;
    // snd.volume = 0.15;

    jQuery.fn.sortElements = (function(){
        var sort = [].sort;
        return function(comparator, getSortable) {
            getSortable = getSortable || function(){return this;};
            var placements = this.map(function(){
                var sortElement = getSortable.call(this),
                    parentNode = sortElement.parentNode,
                    nextSibling = parentNode.insertBefore(
                        document.createTextNode(''),
                        sortElement.nextSibling
                    );
                return function() {
                    if (parentNode === this) {
                        throw new Error("You can't sort elements if any one is a descendant of another.");
                    }
                    parentNode.insertBefore(this, nextSibling);
                    parentNode.removeChild(nextSibling);
                };
            });
            return sort.call(this, comparator).each(function(i){
                placements[i].call(getSortable.call(this));
            });
        };
    })();
    String.prototype.format = function(){
        var a = this;
        for(var k in arguments){
            a = a.replace("{" + k + "}", arguments[k]);
        }
        return a;
    }
    function getCookie(cname){
        var name = cname + "=";
        var decodedCookie = decodeURIComponent(document.cookie);
        var ca = decodedCookie.split(';');
        for(var i = 0; i <ca.length; i++)
        {
            var c = ca[i];
            while (c.charAt(0) == ' ') { c = c.substring(1); }

            if (c.indexOf(name) == 0) { return c.substring(name.length, c.length); }
        }
        return null;
    }
    function refreshaccess(){
        var ajax = $.ajax({
            type : "POST",
            url : location.origin+"/connect/refreshaccess",
            data: "accessToken=" + getCookie("BearerToken"),
            credentials: 'same-origin',
            cache: true,
            mode: 'cors',
            headers : {
                "X-Cache-Ver" : "67",
                "X-Requested-With" : "XMLHttpRequest"
            }
        }).success(function(){
            console.log("TOKEN!");
        });
		return ajax;
	}
    function scapiReq(method, url){
        var bearerToken = getCookie('BearerToken');
        var ajax = $.ajax({
            type : method,
            url : url,
            credentials: 'same-origin',
            cache: false,
            mode: 'cors',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-Lang': 'en-US',
                'X-Cache-Ver': '10',
                'Authorization': "Bearer "+bearerToken
            }
        }).fail(function(xhr){
            if(xhr.status == 401 || xhr.status == 500){
                refreshaccess().success(function(){
                    scapiReq(method, url);
                });
            }
        });
        return ajax;
    }
    function addFsReq(toDel, stOk, stMax, theParam){
        var ajax = $.ajax({
            type : "PUT",
            url : location.origin + ( !theParam ? "/friends/UpdateFriend" : "/crewsapi/UpdateCrew" ),
            cache: false,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-Lang': 'en-US',
                'X-Cache-Ver': '10',
                'Content-type' : 'application/json',
                '__RequestVerificationToken' : $("input[name=__RequestVerificationToken").val(),
            },
            data : JSON.stringify( !theParam ? { id : toDel[0], op : 'addfriend', custommessage : '' } : { id: TPLC, name: "", crewId: ""+TPLC+"", rockstarId: toDel[0], inviteMsg: '', op: 'invite', role: 4 })
        }).success(function(xhr){
            toDel.splice(0, 1);
            if(theParam && !xhr.Status && stMax < toDel.length) $('#statbar').progressbar("option", "max", ++stMax);
            $('#statbar').progressbar("value", ++stOk);
            console.log(stOk+ '/' +stMax);

            if(stOk != stMax){
                setTimeout(function(){
                    addFsReq(toDel, stOk, stMax, theParam);
                }, 1000); // should be 5000 but 1000 is for testing, but still works, weird
            }
        }).fail(function(xhr){
            if(xhr.status != 429){
                refreshaccess().success(function(){
                    addFsReq(toDel, stOk, stMax, theParam);
                });
            } else {
                var sleep = setTimeout(function(){
                    afterSleep();
                    addFsReq(toDel, stOk, stMax, theParam);
                }, 5*60*1000);
                skipSleep(sleep, "inv", toDel, stOk, stMax, null, null);
            }
        }).always(function(xhr){
            console.log(xhr.status, toDel.length);
        });
        return ajax;
    }
    function loopedReqs(method, url, toDel, stOk, stMax, sleepTime){
        scapiReq(method, url.format(toDel[0])).success(function(){
            toDel.splice(0, 1);
            $('#statbar').progressbar("value", ++stOk);
            console.log(stOk+ '/' +stMax);
            if(sleepTime > 0) sleepTime--;

            if(stOk != stMax){
                setTimeout(function(){
                    loopedReqs(method, url, toDel, stOk, stMax, sleepTime);
                }, 5000 + (sleepTimes[sleepTime]*1000) );
            }
        }).fail(function(xhr){
            if(stOk != stMax){
                if(sleepTime < sleepTimes.length-1 && xhr.status == 429) sleepTime++;
                var sleep = setTimeout(function(){
                    afterSleep();
                    loopedReqs(method, url, toDel, stOk, stMax, sleepTime);
                }, 5000 + (sleepTimes[sleepTime]*1000) );
                if(xhr.status == 429) skipSleep(sleep, "other", toDel, stOk, stMax, method, url);
            }
        }).always(function(xhr){
            console.log(xhr.status, 5 + sleepTimes[sleepTime], (5 + sleepTimes[sleepTime])*1000);
        });
    }
    function loopedReqs2(reqs, stOk, stMax){ // used in auto mode
        if(reqs.length == 0) return false;
        scapiReq("POST", reqs[0]).success(function(xhr){
            reqs.splice(0, 1);
            console.log(++stOk+ '/' +stMax, xhr.status);

            if(stOk != stMax){
                setTimeout(function(){
                    loopedReqs2(reqs, stOk, stMax);
                }, 2000);
            }
        }).fail(function(xhr){
            console.log("FAIL", xhr.status);
            return;
        });
    }
    function getHisFriends(owner, fTotal, page, pages, moreOpts, watched, basicprofile){
        var req = scapiReq("GET", "https://scapi.rockstargames.com/friends/getFriends?rockstarId="+owner+"&pageIndex="+page+"&pageSize=30").success(function(){
            getHisFr[page] = req.responseJSON.rockstarAccountList.rockstarAccounts;
            page++;
            if(page > pages){
                for(var i = 1; i < Object.keys(getHisFr).length; i++)
                        getHisFr[0] = getHisFr[0].concat(getHisFr[i]);
                var hisFriends = {
                    rockstarAccountList : {
                        total : fTotal,
                        rockstarAccounts : getHisFr[0]
                    }
                };
                setTimeout(function(){
                    preTable(hisFriends, "myFriendsTable", moreOpts, watched, basicprofile, false);
                }, 1000);
            } else {
                setTimeout(function(){
                    getHisFriends(owner, fTotal, page, pages, moreOpts, watched, basicprofile);
                }, 1000);
            }
        }).always(function(xhr){
            console.log(xhr.status, page-1, pages);
        });
    }
    function skipSleep(timeoutToCancel, mode, toDel, stOk, stMax, method, url){
        $("#dialog-confirm").dialog("option", "buttons", Object.assign({
            //TODO: sleeptime in skipsleep button (setInterval ?)
            'Pomiń SLEEP': function(){
                console.log("SKIP SLEEP");
                clearTimeout(timeoutToCancel);
                if(mode == "inv"){
                    addFsReq(toDel, stOk, stMax);
                } else {
                    loopedReqs(method, url, toDel, stOk, stMax, 0);
                }
                $("#dialog-confirm").dialog("option", "buttons", {
                    "Anuluj!": function(){
                        for (var i = 1; i < 99999; i++)
                            window.clearInterval(i);
                        $("*").css("visibilty", "hidden");
                        location.reload();
                    }
                });
            }
        }, $("#dialog-confirm").dialog("option", "buttons")));
    }
    function afterSleep(){
        console.log("AFTER SLEEP");
        $("#dialog-confirm").dialog("option", "buttons", {
            "Anuluj!": function(){
                for (var i = 1; i < 99999; i++)
                    window.clearInterval(i);
                $("*").css("visibilty", "hidden");
                location.reload();
            }
        });
    }
    function writeCrewNameTag(tableId, i, cssClass, cName, cTag){
        $("table#"+tableId).find('tr').eq(3+i).append("<td class='" + cssClass + "'><a href='/crew/" + cName + "' style=color:inherit;text-decoration:none>" + cName + "</a>");
        $("table#"+tableId).find('tr').eq(3+i).append("<td class='" + cssClass + "'><a href='/crew/" + cName + "' style=color:inherit;text-decoration:none>" + cTag + "</a>");
    }
    function writeTable(response, tableId, tableHeader, myCrew, myCrewName, myTable){
        var fArray = response.rockstarAccountList.rockstarAccounts;
        var fTotal = response.rockstarAccountList.total;
        var i;

        if(fTotal != 0)
        {
            if(tableId == "invitedByThem" && $("div#friendsTTables div").eq(1).find("table").length > 0)
                $("div#friendsTTables div").eq(1).append("<hr>");
            $("div#friendsTTables div").eq(tableId == "myFriendsTable" ? 0 : 1).append("<table id="+tableId+" class=myFriendsTable border=0 rules=all frame=box cellpadding=5 cellspacing=0></table>");
            $("table#"+tableId).css({
                "border-top": "unset",
                "width": "auto",
                "margin": "2.5px",
            });

            $("table#"+tableId).append("<tr id=fHeader class=notSort bgcolor=lightblue>");
            $("table#"+tableId).find('tr').eq(0).append("<td colspan=" + (TPLC == myCrew ? "6" : "5") + " align=center><b>"+tableHeader+" ("+fTotal+")</b>");

            $("table#"+tableId).append("<tr id=fHeader class=notSort align=center bgcolor=lightblue>");
            $("table#"+tableId).find('tr').eq(1).append("<td id=" +tableId + "_options colspan=" + (TPLC == myCrew ? "6" : "5") + " align=center><section></section>");
            $('table td#'+tableId+'_options section').css({
                'width':'auto',
                'height':'auto',
                'display':'table'
            });
            $('table td#'+tableId+'_options section').append("<button type=button id=fMainSelector class=fSelector_"+tableId+">Zaznacz<br>wszystkich</button>");
            $('table td#'+tableId+'_options section').append("&nbsp;<button type=button id=fMainUnSelector class=fSelector_"+tableId+">Odznacz<br>wszystkich</button>");
            if(myCrew != 0) $('table td#'+tableId+'_options section').append("&nbsp;<hr class=vr>&nbsp;<button type=button id=fCrewSelector class=fSelector_"+tableId+">Zaznacz wszystkich <span class=mode>" + (myTable ? "spoza" : "z") + "</span><br><i>"+myCrewName+"</i></button>");
            //przyciski do zarzadzania
            switch(tableId)
            {
                case "myFriendsTable":
                    if(myTable)
                        $('table td#'+tableId+'_options section').append("<br><button type=button id=fDeleter class=fDeleter_"+tableId+" style='border-color:red;width:100%;margin-top:3px'><span class=warn>USUŃ WSZYSTKICH ZAZNACZONYCH ZNAJOMYCH<span id=fSelected_"+tableId+">0</span></span></button>");
                    else
                        $('table td#'+tableId+'_options section').append("<br><button type=button id=fDeleter class=fDeleter_"+tableId+"_2 style='border-color:green;width:100%;margin-top:3px'><span class=okey>ZAPROŚ WSZYSTKICH ZAZNACZONYCH<span id=fSelected_"+tableId+">0</span></span></button>");
                    break;
                case "invitedByMe":
                    $('table td#'+tableId+'_options section').append("<br><button type=button id=fDeleter class=fDeleter_"+tableId+" style='border-color:red;width:100%;margin-top:3px'><span class=warn>ANULUJ ZAZNACZONE ZAPROSZENIA<span id=fSelected_"+tableId+">0</span></span></button>");
                    break;
                case "invitedByThem":
                    $('table td#'+tableId+'_options section').append("<br><button type=button id=fDeleter class=fDeleter_"+tableId+"_2 style='border-color:green;width:calc(50% - 3px);margin-top:3px'><span class=okey>PRZYJMIJ ZAZNACZONE<span id=fSelected_"+tableId+">0</span></span></button>");
                    $('table td#'+tableId+'_options section').append("<button type=button id=fDeleter class=fDeleter_"+tableId+" style='border-color:red;width:calc(50% - 3px);margin-left:6px;margin-top:3px'><span class=warn>ODRZUĆ ZAZNACZONE<span id=fSelected_"+tableId+">0</span></span></button>");
                    break;
            }

            $("table#"+tableId).append("<tr id=fHeader class=notSort align=center bgcolor=lightblue>");
            $("table#"+tableId).find('tr').eq(2).append("<td width=5>");
            $("table#"+tableId).find('tr').eq(2).append("<td width=5>");
            $("table#"+tableId).find('tr').eq(2).append("<td class=toSort -sort-by=1 -sort-order=asc><b>Nazwa użytkowika</b>");
            if(TPLC == myCrew) $("table#"+tableId).find('tr').eq(2).append("<td class=toSort -sort-by=2 -sort-order=asc><b>Aktywność</b>");
            $("table#"+tableId).find('tr').eq(2).append("<td colspan=2><b>Ekipa</b>");

            var rids = [];
            for(i=0; i < fArray.length; i++)
                rids.push(fArray[i].rockstarId);

            var dataQ1 = new FormData();
            dataQ1.append('rockstarIDs', rids.join(','));
            GM_xmlhttpRequest({
				url: "https://tplc.qrix.eu/plcb-db/getLastRank.php?friendsManager=1",
				responseType: "json",
				data: dataQ1,
				method: "POST",
				onreadystatechange: function(response){
					if(response.status == 200 && response.readyState == 4)
					{
						var tmp = eval(response.responseText);

						for(i=0; i < tmp.length; i++)
						{
							fLastRank[tmp[i].rockstarID] = {
								lr: tmp[i].lastRank,
								pc: tmp[i].platformPC,
							};
						}

						for(i=0; i < fArray.length; i++)
						{
							var u = fArray[i];

							u.lrDate = (typeof(fLastRank[u.rockstarId]) != 'undefined') ? fLastRank[u.rockstarId].lr : '0000-00-00';
							if(u.lrDate == null) u.lrDate = '0000-00-00';

							u.lrPC = (typeof(fLastRank[u.rockstarId]) != 'undefined') ? (fLastRank[u.rockstarId].pc) ? 'pc_1' : 'pc_0' : 'pc_2';

							var lessOption = !myTable && u.viewerRelationship.toLowerCase() == "friend";

							u.primaryClanId = ( tableId == "invitedByThem" ? (u.primaryClan == undefined ? undefined : u.primaryClan.id) : u.primaryClanId );
							u.primaryClanTag = ( tableId == "invitedByThem" ? (u.primaryClan == undefined ? undefined : u.primaryClan.tag) : u.primaryClanTag );
							u.primaryClanTag = ( u.primaryClanTag == undefined ? undefined : u.primaryClanTag.toUpperCase() );
							u.primaryClanName = ( tableId == "invitedByThem" ? (u.primaryClan == undefined ? undefined : u.primaryClan.name) : u.primaryClanName );
							var cssClass = ( u.primaryClanId == myCrew ? 'myCrew' : 'killHim' );
							var cssUClass = u.displayName.toLowerCase().replace(/[^0-9a-z]/gi, '');
							var cssFClass = (lessOption ?  (u.viewerRelationship.toLowerCase() == "friend" ? "_f1" : "_f0") : "");

							var finalClass = cssClass + cssFClass + "_" + u.primaryClanId + " " + cssUClass + "_" + u.rockstarId + " d_" + u.lrDate.replace(/[^0-9a-z]/gi, '') + "_" + cssUClass;

							$("table#"+tableId).append("<tr class='" + finalClass + "' align=center>");
							if(!lessOption) $("table#"+tableId).find('tr').eq(3+i).append("<td><input type=checkbox value=" + u.rockstarId + " name=toDelete form='' id="+tableId+">");
							$("table#"+tableId).find('tr').eq(3+i).append("<td " + (lessOption ? "colspan=2 bgcolor=green" : "") + "><img class=tt_avatar width=50 height=50 src=https://a.rsg.sc//n/" + u.displayName.toLowerCase() + "/s>");
							$("table#"+tableId).find('tr').eq(3+i).append("<td align=left><a href=/member/" + u.displayName + " style=color:inherit>" + u.displayName + "</a>");
							if(TPLC == myCrew) $("table#"+tableId).find('tr').eq(3+i).append("<td>" + u.lrDate + "<br><span class=" + u.lrPC + ">GTAO&nbsp;-&nbsp;PC</span>");

							if(u.primaryClanName == undefined)
								$("table#"+tableId).find('tr').eq(3+i).append("<td colspan=2 class='" + cssClass + "'>-- brak ekipy --");
							else
								writeCrewNameTag(tableId, i, cssClass, u.primaryClanName, u.primaryClanTag);
						}

						$("body").on("click", 'table#'+tableId+' td.toSort button', function(){
							var x = $(this).parent().attr('-sort-by');
							var o = $(this).parent().attr('-sort-order');
							$('table.myFriendsTable').each(function(){
								$(this).find('tr').sortElements(function(a, b){
									if($(a).attr('class') != 'notSort' && $(b).attr('class') != 'notSort'){
										var ac = $(a).attr('class').split(' ');
										var bc = $(b).attr('class').split(' ');

										if(o == 'asc')
											return ac[0]+'_'+ac[x] > bc[0]+'_'+bc[x] ? 1 : -1;
										else if(o == 'desc')
											return ac[0].replace('killHim', 'zkillHim')+'_'+ac[x] < bc[0].replace('killHim', 'zkillHim')+'_'+bc[x] ? 1 : -1;
									}
								});
							});
						});
						$('table#'+tableId+' td.toSort').each(function(){
							$(this).append("<br><button type=button style=width:100%>Sortuj</button>");
						});
						$('table#'+tableId+' td.toSort button').eq(0).trigger('click');
						$("img.tt_avatar").error(function(){
							$(this).attr("src", "https://s.rsg.sc/sc/images/avatars/128x128/default.png");
						});
					}
				}
			})

            var fLastRank = {};

        }
    }
    function preTable(rJSON, tableId, moreOpts, watched, basicprofile, myTable){
        $("button#smode_button").prop("disabled", false);
        $("div#friendsTTables").html("<div></div><div></div>");
        $("div#friendsTTables").css({
            "padding": "5px",
            "display": "inline-flex",
            "flex-wrap": "wrap",
            "justify-content": "center",
        });
        writeTable(rJSON, "myFriendsTable", (moreOpts ? "Moi znajomi" : "Znajomi gracza "+watched), basicprofile.primaryClanId, basicprofile.primaryClanName, myTable);
    }
    function preLoad(){
        var loadInf = setInterval(function(){
            if($("div.Friends__wrap__1WLHZ").length != 0 && $("div.Friends__card__1i73B").length != 0){
                clearInterval(loadInf);
                $("div.Friends__wrap__1WLHZ").css("text-align", "center");
                $("div.Friends__card__1i73B").hide();
                $("div.Friends__wrap__1WLHZ").append("<div id=friendsTTables class='Friends__card__1i73B UI__Card__card UI__Card__shadow'><p></p><p style=max-width:unset><b>Loading...</b></p></div>");
            }
        }, 1000);
    }

	function getAddFriendsButtons(container){
		let buttons = {
			"Ręcznie": function(){
				container.dialog("destroy");
				$("#dialog-confirm").html('');
				dialog("confirm_af_textfield", "Wpisz ID po przecinku:<br><textarea id=rids></textarea>");
			},
			"PolishCartelBot": function(){
				container.dialog("destroy");
				$("#dialog-confirm").html('');
				dialog("confirm_af_textfield", "Poniżej znajdują się ID graczy TPLC, którzy obecnie są w grze (ewentualnie grali dość niedawno). Gracze ci zostaną dodani do Twojej listy znajomych. Po zakończeniu procesu sprawdź na liście wysłanych zaproszeń czy aby na pewno wszyscy gracze nadal są członkami ekipy.<br><textarea disabled id=rids>"+AkwizytorkaRID+"</textarea>");
				addFriends("polishcartelbot");
			},
			"Anuluj!": function(){
				container.dialog("destroy");
				$("#dialog-confirm").html('');
			}
		};
		if($(".appPage").find('.UI__CrewTag__crewTag').first().attr('href') != "/crew/the_polish_cartel")
			delete buttons['PolishCartelBot'];
		return buttons;
	}

    function dialog(type, alert, okFunc, okFuncArg){
        var buttons;
        switch(type)
        {
            case 'confirm':
                buttons = {
                    "Ok!": function(){
                        $(this).dialog("destroy");
                        $("#dialog-confirm").html('');
                        okFunc(okFuncArg);
                    },
                    "Anuluj!": function(){
                        $(this).dialog("destroy");
                        $("#dialog-confirm").html('');
                    }
                };
                break;
            case 'confirm-location':
                buttons = {
                    "Przejdź!": function(){
                        $(this).dialog("destroy");
                        $("#dialog-confirm").html('');
                        location.replace(okFunc);
                    },
                    "Anuluj!": function(){
                        $(this).dialog("destroy");
                        $("#dialog-confirm").html('');
                    }
                };
                break;
            case 'alert':
                buttons = {
                    "Ok!": function(){
                        $(this).dialog("destroy");
                        $("#dialog-confirm").html('');
                    },
                };
                break;
            case 'no-buttons':
                buttons = {};
                break;
            case 'af':
                buttons = getAddFriendsButtons($(this));
                break;
            case 'confirm_af_textfield':
                buttons = {
                    "Ok!": function(){
                        var toNxtFunc = $(this).find("#rids").val().replace(/\s/g, "").split(",");
                        $(this).dialog("destroy");
                        $("#dialog-confirm").html('');
                        addFriends("textfield", toNxtFunc);
                    },
                    "Anuluj!": function(){
                        $(this).dialog("destroy");
                        $("#dialog-confirm").html('');
                    }
                };
                break;
            case 'pbar':
                buttons = {
                    "Anuluj!": function(){
                        for (var i = 1; i < 99999; i++)
                            window.clearInterval(i);
                        $("*").css("visibilty", "hidden");
                        location.reload();
                    }
                };
                break;
        }

        $("#dialog-confirm").html(alert);
        $("#dialog-confirm").dialog({
            draggable: false,
            resizable: false,
            modal: true,
            height: "auto",
            width: 400,
            dialogClass: "dialog-confirm",
            position: {
                my: "center",
                at: "top",
                of: window
            },
            buttons: buttons
        });
        $("div.dialog-confirm").css("z-index", 9999);
    }
    function addFriends(mode, rids){
        var theParam = false;
        if(mode == "textfield" || mode == "ff"){
            // string to integer
            if(rids[0] == "crew") theParam = true; rids.splice(0, 1);
            console.log(rids);
            for(var i = 0; i < rids.length; i++){
                if(Number.isInteger(+rids[i]) && +rids[i] != 0){
                    rids[i] = +rids[i];
                } else {
                    dialog("alert", "Wprowadziłeś blędne ID!");
                    return false;
                }
            }
        } else if(mode == "polishcartelbot") {
			GM_xmlhttpRequest({
				url: "https://tplc.qrix.eu/plcb-db/getLastActiveUsersIDsOnPC.php?mode=byROSOrTotalTimePlay&time=40",
				onload: function(response){
					$('#rids').val(AkwizytorkaRID+","+response.responseText)
				}
			})
        }

        // delete id of my friends - TODO: find how to chceck the invites here
        if(!theParam && (mode == "textfield" || mode == "polishcartelbot")){
            var onList = [];
            $("input[type=checkbox]").each(function(){
                onList.push(+$(this).val());
            });
            rids = rids.filter(function(x){
                return onList.indexOf(x) < 0;
            });
        }

        // max invites = 100
        if(!theParam && rids.length > 100){
            var invsAS = $("table#invitedByMe input[type=checkbox]").length;
            rids = rids.slice(0, 100-invsAS);
        }

        var invMax = !theParam ? rids.length : 100;
        if(invMax > 0){
            progress(invMax);
            addFsReq(rids, 0, invMax, theParam);
        } else {
            dialog("alert", "Brak osób do zaproszena! Być może podałeś wyłącznie ID kogoś kogo masz w znajomych.");
        }
    }
    function manageFriends(argArray){
        var reqUri = argArray[0];
        var toDel = argArray[1];
        var invates = argArray[2];
        if(invates) return addFriends("ff", toDel);
        var stMax = toDel.length;
        progress(stMax);
        loopedReqs("POST", reqUri, toDel, 0, stMax, 0);
    }
    function progress(stMax){
        dialog('pbar', "<center><b style=color:red>Pracuję... może to potrwać kilka minut!<br><br><span id=sleep></span><!--Możesz podejrzeć co robię w konsoli :)--><div id=statbar><div class=val>0/"+stMax+"</div></div></center>");
        $('#statbar').progressbar({
            max: stMax,
            value: 0,
            change: function(){
                $(this).find('div.val').text($(this).progressbar("option", "value") + '/' + $(this).progressbar("option", "max"));
            },
            complete: function(){
                // snd.play();
                $(this).find('div.val').text('Gotowe!');
                $("#dialog-confirm").dialog("option", "buttons", {
                    'Kontynuj!': function(){
                        location.reload();
                    }
                });
            },
        });
    }

    $(document).ready(function(){
        // if user is logged in
        if(getCookie('BearerToken') != null){
            // make reload when it is needed to work
            $("body").on("click", "a", function(){
                if($(this).attr("href").match("^\/member\/.+\/friends$") || location.pathname.match("^\/member\/.+\/friends$")){
                    location.replace($(this).attr("href"));
                }
            });
            if(location.pathname.match("^\/member\/.+\/friends$")){
                console.log("WORKING!");
                // make a view
                $('body').append("<div id=dialog-confirm></div>");
                $('body').append('<style>.NavigationTop__wrap__fQdBR { background: black; }</style>');
                $('body').prepend('<div id=tytusowe_buttony class=m></div>');
                $('div#tytusowe_buttony.m').css({
                    'margin': '60px 0 0',
                    'padding': '10px 20px',
                    'background': '#ffc8c8',
                    'border-bottom': '2px #000000 solid',
                    'position': 'sticky',
                    'z-index': '999',
                    'top': '60px',
                    'width': '100%',
                    'text-align': 'right',
                });
                var dtime = 10;
                $('div#tytusowe_buttony.m').append('<button disabled type=button id=smode_button class="getFriendsFiltered UI__Button-socialclub__btn UI__Button-socialclub__ghost UI__Button-socialclub__medium" onclick="return false;" style=margin-top:3px>Zmień widok</button>');
                $('div#tytusowe_buttony.m').append('&nbsp;<button disabled type=button id=addF_button class="getFriendsFiltered UI__Button-socialclub__btn UI__Button-socialclub__ghost UI__Button-socialclub__medium" onclick="return false;" style=margin-top:3px>Kliknij, aby <u>dodać</u> znajomych!<span class=dtime> ('+dtime+')</span></button>');
                $("body").on("mouseover", "button#addF_button, button#smode_button", function(){ $(this).css('background', 'grey'); });
                $("body").on("mouseout", "button#addF_button, button#smode_button", function(){  $(this).css('background', 'white'); });
                $("button#addF_button, button#smode_button").css('background', 'white');
                setInterval(function(){
                    $("button#addF_button span.dtime").text(" ("+--dtime+")");
                    if(dtime <= 0){
                        $("button#addF_button span.dtime").text("");
                        $("button#addF_button").prop("disabled", false);
                    }
                }, 1000);
                $('div#tytusowe_buttony.m').append('&nbsp;<button type=button id=rl_button class="getFriendsFiltered UI__Button-socialclub__btn UI__Button-socialclub__success UI__Button-socialclub__medium" onclick="location.reload();">ODŚWIEŻ!</button>');
                $("body").on("mouseover", "button#rl_button", function(){ $(this).css('background', 'darkgreen'); });
                $("body").on("mouseout", "button#rl_button", function(){  $(this).css('background', 'linear-gradient(90deg,#2d862d,#393)'); });
                $("button#rl_button").css('border-color', '#000');
                // make this work
                var watched = location.pathname.replace("/member/", "").replace("/friends", "");
                var basicprofile, myFriends, myFriends2, invitedByMe, invitedByThem;
                basicprofile = scapiReq("GET", "https://scapi.rockstargames.com/profile/getbasicprofile").success(function(){
                    basicprofile = basicprofile.responseJSON.accounts[0].rockstarAccount;
                    var me = basicprofile.name;
                    var moreOpts = watched == me;
                    if(moreOpts){
                        $("body").on("click", "button#addF_button", function(){
                            dialog("af", "W jaki spsób chcesz przekazać listę osób (ich ID), do których chcesz wysłać zaproszenie?");
                        });
                        myFriends = scapiReq("GET", "https://scapi.rockstargames.com/friends/getFriendsFiltered?onlineService=sc&nickname=&pageIndex=0&pageSize=250").success(function(){
                            preLoad();
                            setTimeout(function(){
                                myFriends2 = scapiReq("GET", "https://scapi.rockstargames.com/friends/getFriendsFiltered?onlineService=sc&nickname=&pageIndex=1&pageSize=250").success(function(){
                                    myFriends = myFriends.responseJSON;
                                    myFriends2 = myFriends2.responseJSON;
                                    myFriends.rockstarAccountList.rockstarAccounts = $.merge(myFriends.rockstarAccountList.rockstarAccounts, myFriends2.rockstarAccountList.rockstarAccounts);
                                    setTimeout(function(){
                                        preTable(myFriends, "myFriendsTable", moreOpts, watched, basicprofile, true);
                                        invitedByMe = scapiReq("GET", "https://scapi.rockstargames.com/friends/getInvitesSent?onlineService=sc&nickname=&pageIndex=0&pageSize=250").success(function(){
                                            invitedByMe = invitedByMe.responseJSON;
                                            writeTable(invitedByMe, "invitedByMe", "Zaproszeni przeze mnie", basicprofile.primaryClanId, basicprofile.primaryClanName, true);
                                            invitedByThem = scapiReq("GET", "https://scapi.rockstargames.com/friends/getInvites").success(function(){
                                                invitedByThem = invitedByThem.responseJSON;
                                                writeTable(invitedByThem, "invitedByThem", "Zaproszenia od innych", basicprofile.primaryClanId, basicprofile.primaryClanName, true);
                                            });
                                        });
                                    }, 5000);
                                });
                            }, 1000);
                        });
                    } else {
                        $("body").on("click", "button#addF_button", function(){
                            dialog("confirm-location", "Z tej opcji można skorzystać tylko z poziomu twojej listy znajomych!<br><br>Chesz do niej przejśc?", "/member/"+me+"/friends");
                        });
                         myFriends = scapiReq("GET", "https://scapi.rockstargames.com/profile/getprofile?nickname="+watched+"&maxFriends=0").success(function(){
                             var otherprofile = myFriends.responseJSON.accounts[0].rockstarAccount;
                             if(otherprofile.friendCount > 0){
                                 preLoad();
                                 getHisFriends(otherprofile.rockstarId, otherprofile.friendCount, 0, Math.ceil(otherprofile.friendCount/30)-1, moreOpts, watched, basicprofile);
                             }
                         });
                    }
                });
                // make this really work
                $("body").on("click", "button#smode_button", function(){
                    $("div.Friends__card__1i73B").toggle();
                });
                $("body").on("click", "button#fMainSelector", function(){
                    $('table#'+this.className.substr(10)+' input[type="checkbox"]').each(function(){
                        $(this).prop("checked",true).trigger("change");
                    });
                    return false;
                });
                $("body").on("click", "button#fMainUnSelector", function(){
                    $('table#'+this.className.substr(10)+' input[type="checkbox"]').each(function(){
                        $(this).prop("checked",false).trigger("change");
                    });
                    return false;
                });
                $("body").on("click", "button#fCrewSelector", function(){
                    var spoza = $(this).find("span.mode").text() == "spoza";
                    $('table#'+this.className.substr(10)+' tr[class^="killHim"] input[type="checkbox"]').each(function(){
                        $(this).prop("checked",spoza).trigger("change");
                    });
                    $('table#'+this.className.substr(10)+' tr[class^="myCrew"] input[type="checkbox"]').each(function(){
                        $(this).prop("checked",!spoza).trigger("change");
                    });
                    return false;
                });
                $("body").on("change", "input[type='checkbox']", function(){
                    var tid = $(this).attr('id');
                    var csc = $('table#'+tid).find('input:checkbox:checked').length;
                    $('span#fSelected_'+tid).text(csc);
                    return false;
                });
                $("body").on("click", "button#fDeleter", function(){
                    var mode = $(this).attr('class').substr(9);
                    var mode2 = (mode.substr(-2) == "_2" ? mode.substr(0, mode.length-2) : mode);
                    var toDelete = [];
                    var toWarn = [];
                    $('table#'+mode2).find('input:checkbox:checked').each(function(){
                        var v = $(this).val();
                        toDelete.push(v);
                        toWarn.push( $("tr[class*='"+v+"'] td").eq(2).text() );
                    });
                    var howMany = toDelete.length;
                    if(howMany == 0)
                    {
                        dialog('alert', "<center style=color:red;font-weight:bold>!!! BŁĄD !!!<br>Nikogo nie zaznaczyłeś!</center>");
                        return false;
                    }
                    else
                    {
                        var confirmFirst, reqUri, inv;
                        switch(mode)
                        {
                            case "myFriendsTable":
                                confirmFirst = "<b style=color:red>Czy na pewno chcesz usunąć {0} znajomych? Operacji nie można cofnąć!</b><br><br><b>Znajomi wybrani do usunięcia:</b><br>{1}";
                                reqUri = "https://scapi.rockstargames.com/friends/remove?rockstarId={0}";
                                inv = false;
                                break;
                            case "myFriendsTable_2":
                                confirmFirst = "<b style=color:red>Czy na pewno chcesz zaprosić {0} osoby? Operacji nie można cofnąć!</b><br><br><b>Osoby wybrane do zaproszenia:</b><br>{1}";
                                reqUri = location.origin+"/friends/UpdateFriend"; // actually it does not matter in here
                                inv = true;
                                break;
                            case "invitedByMe":
                                confirmFirst = "<b style=color:red>Czy na pewno chcesz anulować {0} zaproszeń? Operacji nie można cofnąć!</b><br><br><b>Osoby, do których zaproszenia zostaną anulowane:</b><br>{1}";
                                reqUri = "https://scapi.rockstargames.com/friends/cancelInvite?rockstarId={0}&isMyOwnInvite=true";
                                inv = false;
                                break;
                            case "invitedByThem":
                                confirmFirst = "<b style=color:red>Czy na pewno chcesz odrzucić {0} zaproszeń? Operacji nie można cofnąć!</b><br><br><b>Osoby, których zaproszenia zostaną odrzucne:</b><br>{1}";
                                reqUri = "https://scapi.rockstargames.com/friends/cancelInvite?rockstarId={0}";
                                inv = false;
                                break;
                            case "invitedByThem_2": //accept invite
                                confirmFirst = "<b style=color:red>Czy na pewno chcesz <u>przyjąć</u> {0} zaproszeń? Operacji nie można cofnąć!</b><br><br><b>Osoby, które zostaną dodane do znajomych:</b><br>{1}";
                                reqUri = "https://scapi.rockstargames.com/friends/acceptInvite?rockstarId={0}";
                                inv = false;
                                break;
                            default:
                                dialog('alert', "<center style=color:red;font-weight:bold>!!! Błąd !!!<br>Nieznana operacja!</center>");
                                return false;
                                break;
                        }
                        dialog('confirm', confirmFirst.format('<u>'+howMany+'</u>', '<i>'+toWarn.join(', ')+'</i>'), manageFriends, [reqUri, toDelete, inv]);
                    }
                });
            } else if(location.pathname.match("^\/member\/.+\/friends\/auto$")){
                console.log("WORKING-AUTO!");
                $("html").prepend("<link rel='stylesheet' href='https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css'>");
                var fToDel = []; var iToDel = []; var iToAdd = [];
                var reqs = [];
                refreshaccess().success(function(){
                    setTimeout(function(){
                        myFriends = scapiReq("GET", "https://scapi.rockstargames.com/friends/getFriendsFiltered?onlineService=sc&nickname=&pageIndex=0&pageSize=250").success(function(){
                            setTimeout(function(){
                                myFriends2 = scapiReq("GET", "https://scapi.rockstargames.com/friends/getFriendsFiltered?onlineService=sc&nickname=&pageIndex=1&pageSize=250").success(function(){
                                    myFriends = $.merge(myFriends.responseJSON.rockstarAccountList.rockstarAccounts, myFriends2.responseJSON.rockstarAccountList.rockstarAccounts);
                                    setTimeout(function(){
                                        invitedByThem = scapiReq("GET", "https://scapi.rockstargames.com/friends/getInvites").success(function(){
                                            invitedByThem = invitedByThem.responseJSON.rockstarAccountList.rockstarAccounts || [];
                                            if(249 - myFriends.length < invitedByThem.length){
                                                var rids = []; var tmpMF = {};
                                                $.each(myFriends, function(_,v){
                                                    rids.push(v.rockstarId);
                                                    tmpMF[v.rockstarId] = {
                                                        rockstarId: v.rockstarId,
                                                        primaryClanId: v.primaryClanId
                                                    };
                                                });
                                                var dataQ2 = new FormData();
                                                dataQ2.append('rockstarIDs', rids.join(','));
                                                GM_xmlhttpRequest({
													url: "https://tplc.qrix.eu/plcb-db/getLastRank.php?friendsManager=1",
													responseType: "json",
													data: dataQ2,
													method: "POST",
													onreadystatechange: function(response){
														if(response.status == 200 && response.readyState == 4){
															$.each(eval(response.responseText), function(_,v){
																tmpMF[v.rockstarID]["lastRank"] = v.lastRank;
															});
															var tmpMF2 = [];
															$.each(tmpMF, function(_,v){ tmpMF2.push(v); });
															tmpMF2.sort(function(a,b){
																if(a.lastRank == b.lastRank)
																	return 0;
																return a.lastRank < b.lastRank ? 1 : -1;
															}).reverse();
															$.each(tmpMF2, function(k,v){
																if(v.primaryClanId != TPLC || k < invitedByThem.length +1)
																	reqs.push("https://scapi.rockstargames.com/friends/remove?rockstarId="+v.rockstarId); // friends to remove
															});
															$.each(invitedByThem, function(k,v){
																if(v.primaryClan == undefined || v.primaryClan.id != TPLC) reqs.push("https://scapi.rockstargames.com/friends/cancelInvite?rockstarId="+v.rockstarId); // invites to decline
																else if(v.primaryClan != undefined || v.primaryClan.id == TPLC) reqs.push("https://scapi.rockstargames.com/friends/acceptInvite?rockstarId="+v.rockstarId); // invites to accept; else would be enough, but #rockstarLogic is unpredictable, so... for safety!
															});
															loopedReqs2(reqs, 0, reqs.length);
														}
													}
												})
                                            } else {
                                                $.each(myFriends, function(k,v){
                                                    if(v.primaryClanId != TPLC) reqs.push("https://scapi.rockstargames.com/friends/remove?rockstarId="+v.rockstarId); // friends to remove
                                                });
                                                $.each(invitedByThem, function(k,v){
                                                    if(v.primaryClan == undefined || v.primaryClan.id != TPLC) reqs.push("https://scapi.rockstargames.com/friends/cancelInvite?rockstarId="+v.rockstarId); // invites to decline
                                                    else if(v.primaryClan != undefined || v.primaryClan.id == TPLC) reqs.push("https://scapi.rockstargames.com/friends/acceptInvite?rockstarId="+v.rockstarId); // invites to accept; else would be enough, but #rockstarLogic is unpredictable, so... for safety!
                                                });
                                                loopedReqs2(reqs, 0, reqs.length);
                                            }
                                        });
                                    }, 2000);
                                });
                            }, 2000);
                        });
                    }, 2000);
                });
            } else { console.log("NOT WORKING!"); }
        }
    });
})();