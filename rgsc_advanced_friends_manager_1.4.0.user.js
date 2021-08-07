// ==UserScript==
// @name            RGSC Advanced Friends Manager
// @author          PLTytus
// @version         1.4.0
// @namespace       http://testertytus.ct8.pl/tampermonkey/rgsc_advanced_friends_manager.user.js
// @downloadURL     http://testertytus.ct8.pl/tampermonkey/rgsc_advanced_friends_manager.user.js
// @updateURL       http://testertytus.ct8.pl/tampermonkey/rgsc_advanced_friends_manager.user.js
// @match           https://*.socialclub.rockstargames.com/*
// @match           https://socialclub.rockstargames.com/*
// @match           https://scapi.rockstargames.com/*
// @grant           none
// @require         http://code.jquery.com/jquery-1.12.4.min.js
// @require         http://code.jquery.com/ui/1.12.1/jquery-ui.js
// ==/UserScript==

(function() {
    'use strict';

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

    function getCookie(cname)
    {
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
    function setLang(lang)
    {
        var exdays = 360;
        var cname = 'rockstarweb_lang.prod';
        var cvalue = lang;
        var d = new Date();
        d.setTime(d.getTime() + (exdays*24*60*60*1000));
        var expires = "expires=" + d.toGMTString();
        document.cookie = cname + "=" + cvalue + ";" + expires + ";domain=.rockstargames.com;path=/";
        location.reload();
    }
    function sleep(milliseconds)
    {
        var start = new Date().getTime();
        while(true)
            if ((new Date().getTime() - start) > milliseconds)
                break;
    }
    function setHead(query)
    {
        query.setRequestHeader('X-Cache-Ver', 67);
        query.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        query.setRequestHeader('Authorization', 'Bearer '+location.hash.substr(1));
        query.setRequestHeader('Access-Control-Allow-Credentials', true);
    }
    function writeCrewNameTag(tableId, i, cssClass, cName, cTag)
    {
        $("table#"+tableId).find('tr').eq(2+i).append("<td class='" + cssClass + "'>" + cName);
        $("table#"+tableId).find('tr').eq(2+i).append("<td class='" + cssClass + "'>" + cTag);
    }
    function writeTable(req, tableId, tableHeader, myCrew, myCrewName, newReq, newReqMethod, newReqUrl)
    {
        if(req.status == 200 && req.readyState == 4)
        {
            var fArray = eval("[" + req.response + "][0].rockstarAccountList.rockstarAccounts");
            var fTotal = eval("[" + req.response + "][0].rockstarAccountList.total");
            var i;

            if(fTotal != 0)
            {
                $('div#topTopow').append("<div id=div_"+tableId+" class=divButtons></div>");
                $('div#div_'+tableId).append("<span>"+tableHeader+" - "+fTotal+"</span><br>");
                $('div#div_'+tableId).append("<button type=button id=fMainSelector class=fSelector_"+tableId+">Zaznacz wszystkich</button>");
                $('div#div_'+tableId).append("&nbsp;<button type=button id=fMainUnSelector class=fSelector_"+tableId+">Odznacz wszystkich</button>&nbsp;<hr class=vr>");
                $('div#div_'+tableId).append("&nbsp;<button type=button id=fCrewSelector class=fSelector_"+tableId+">Zaznacz wszystkich spoza "+myCrewName+"!</button>");

                //przyciski do zarzadzania
                switch(tableId)
                {
                    case "myFriendsTable":
                        $('div#div_'+tableId).append("<br><button type=button id=fDeleter class=fDeleter_"+tableId+" style='border-color:red;width:calc(100% - 3px)'><span class=warn>USUŃ WSZYSTKICH ZAZNACZONYCH ZNAJOMYCH<span id=fSelected_"+tableId+">0</span></span></button>");
                        break;
                    case "invitedByMe":
                        $('div#div_'+tableId).append("<br><button type=button id=fDeleter class=fDeleter_"+tableId+" style='border-color:red;width:calc(100% - 3px)'><span class=warn>ANULUJ ZAZNACZONE ZAPROSZENIA<span id=fSelected_"+tableId+">0</span></span></button>");
                        break;
                    case "invitedByThem":
                        $('div#div_'+tableId).append("<br><button type=button id=fDeleter class=fDeleter_"+tableId+"_2 style='border-color:green;width:calc(50% - 3px)'><span class=okey>PRZYJMIJ ZAZNACZONE<span id=fSelected_"+tableId+">0</span></span></button>");
                        $('div#div_'+tableId).append("<button type=button id=fDeleter class=fDeleter_"+tableId+" style='border-color:red;width:calc(50% - 3px)'><span class=warn>ODRZUĆ ZAZNACZONE<span id=fSelected_"+tableId+">0</span></span></button>");
                        break;
                }

                $('div#topTopow').append("<hr class=hrOne>"); //to musi sie appendowac do #topTopow

                $("div#tableBox").append("<table id="+tableId+" class=myFriendsTable border=0 rules=all frame=void cellpadding=3 cellspacing=0></table>");

                $("table#"+tableId).append("<tr id=fHeader class=notSort>");
                $("table#"+tableId).find('tr').eq(0).append("<td colspan=5>"+tableHeader+" - "+fTotal);

                $("table#"+tableId).append("<tr id=fHeader class=notSort>");
                $("table#"+tableId).find('tr').eq(1).append("<td width=10%>");
                $("table#"+tableId).find('tr').eq(1).append("<td width=45% class=toSort -sort-by=1 -sort-order=asc>Nazwa użytkowika");
                $("table#"+tableId).find('tr').eq(1).append("<td class=toSort -sort-by=2 -sort-order=asc>Aktywność");
                $("table#"+tableId).find('tr').eq(1).append("<td width=45% colspan=2>Ekipa");

                var rids = [];
                for(i=0; i < fArray.length; i++)
                    rids.push(fArray[i].rockstarId);

                var dataQ1 = new FormData();
                dataQ1.append('rockstarIDs', rids.join(','));
                var plcbQ1 = new XMLHttpRequest();
                plcbQ1.open("POST", 'https://tplc.qrix.eu/plcb-db/getLastRank.php', true);
                plcbQ1.send(dataQ1);

                var fLastRank = {};

                plcbQ1.onreadystatechange = function(){
                    if(plcbQ1.status == 200 && plcbQ1.readyState == 4)
                    {
                        var tmp = eval(plcbQ1.responseText);

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
                            //u.lrPC = (fLastRank[u.rockstarId].pc) ? 'pc_1' : 'pc_0';

                            u.primaryClanId = ( tableId == "invitedByThem" ? u.primaryClan.id : u.primaryClanId );
                            u.primaryClanTag = ( tableId == "invitedByThem" ? u.primaryClan.tag : u.primaryClanTag );
                            u.primaryClanTag = ( u.primaryClanTag == undefined ? undefined : u.primaryClanTag.toUpperCase() );
                            u.primaryClanName = ( tableId == "invitedByThem" ? u.primaryClan.name : u.primaryClanName );
                            var cssClass = ( u.primaryClanId == myCrew ? 'myCrew' : 'killHim' );
                            var cssUClass = u.displayName.toLowerCase().replace(/[^0-9a-z]/gi, '');

                            var finalClass = cssClass + "_" + u.primaryClanId + " " + cssUClass + "_" + u.rockstarId + " d_" + u.lrDate.replace(/[^0-9a-z]/gi, '') + "_" + cssUClass;

                            $("table#"+tableId).append("<tr class='" + finalClass + "'>");
                            $("table#"+tableId).find('tr').eq(2+i).append("<td><input type=checkbox value=" + u.rockstarId + " name=toDelete form='' id="+tableId+">");
                            $("table#"+tableId).find('tr').eq(2+i).append("<td>" + u.displayName);
                            $("table#"+tableId).find('tr').eq(2+i).append("<td>" + u.lrDate + "&nbsp;<hr class=vr>&nbsp;<span class=" + u.lrPC + ">PC</span>");

                            if(u.primaryClanName == undefined)
                                $("table#"+tableId).find('tr').eq(2+i).append("<td colspan=2 class='" + cssClass + "'>-- brak ekipy --");
                            else
                                writeCrewNameTag(tableId, i, cssClass, u.primaryClanName, u.primaryClanTag);
                        }

                        $("body").on("click", 'table#'+tableId+' td.toSort button', function(){
                            var x = $(this).parent().attr('-sort-by');
                            var o = $(this).parent().attr('-sort-order');
                            $('table.myFriendsTable').each(function(){
                                $(this).find('tr').sortElements(function(a, b){
                                    if($(a).attr('class') != 'notSort' && $(b).attr('class') != 'notSort')
                                    {
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
                    }
                }
            }

            if(newReq != null && newReqMethod != null && newReqUrl != null)
            {
                newReq.open(newReqMethod, newReqUrl, true)
                setHead(newReq);
                newReq.send();
            }
        }
        else if(req.status != 200 && req.readyState == 4) dialog('alert', "<center style=color:red;font-weight:bold>!!! Błąd !!!<br>Przałduja cała stronę! (F5 :])</center>");
    }
    function dialog(type, alert, okFunc, okFuncArg)
    {
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
    }
    function manageFriends(argArray)
    {
        var reqUri = argArray[0];
        var toDel = argArray[1];
        var stOk = 0;
        var stMax = toDel.length;
        var reqs = {};
        var lastReq = toDel[-1];
        var sleepTimes = [5, 10, 15, 20, 30, 45, 60] //*1000ms
        var sleepTime = 0;
        dialog('no-buttons', "<center><b style=color:red>Pracuję... może to potrwać kilka minut!<br><br><!--Możesz podejrzeć co robię w konsoli :)--><div id=statbar><div class=val>"+stOk+"/"+stMax+"</div></div></center>");
        $('#statbar').progressbar({
            max: stMax,
            value: 0,
            // create: function(){
                // $("#dialog-confirm").dialog("option", "buttons", {
                    // '<b>Przerwij!</b>': function(){
                        // clearInterval(deleter);
                        // location.reload();
                    // }
                // });
            // },
            change: function(){
                $(this).find('div.val').text(stOk + '/' + stMax);
            },
            complete: function(){
                $(this).find('div.val').text('Gotowe!');
                $("#dialog-confirm").dialog("option", "buttons", {
                    'Kontynuj!': function(){
                        location.reload();
                    }
                });
            },
        });
        var deleter = setInterval(function(){
            var rid = toDel[0];
            reqs[rid] = new XMLHttpRequest();
            reqs[rid].open("POST", reqUri.format(rid), false)
            setHead(reqs[rid]);
            reqs[rid].onreadystatechange = function(){
                if(reqs[rid].status == 200 && reqs[rid].readyState == 4)
                {
                    var index = toDel.indexOf(rid);
                    if (index > -1) toDel.splice(index, 1);
                    delete reqs[rid];
                    $('#statbar').progressbar("value", ++stOk);
                    console.log(stOk+ '/' +stMax);
                    if(sleepTime > 0) sleepTime--;
                    if(stOk == stMax) clearInterval(deleter);
                }
                else if(reqs[rid].status != 200 && reqs[rid].readyState == 4)
                {
                    if(reqs[rid].status == 429)
                    {
                        console.log('Spać ' + sleepTimes[sleepTime] + 's! [429]');
                        sleep(sleepTimes[sleepTime]*1000);
                        if(sleepTime < sleepTimes.length-1) sleepTime++;
                    }
                    else if(reqs[rid].status == 401)
                    {
                        console.log('Czekać na Token! Spać 1s! [401]'); //wywala 401 az do 429, po 429 powinnien odzyskac token!
                        sleep(1000);
                    }
                }
            }
            sleep(1000);
            reqs[rid].send();
            sleep(1000);
            if(stOk == stMax) clearInterval(deleter);
        }, 1000);
    }

    $(document).ready(function(){
        //jesli nie scapi
        if(location.hostname.substr(0,5) != 'scapi')
        {
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
                'text-align': 'center',
            });

            //jesli user is not logged in
            if(getCookie('BearerToken') == null)
            {
                $('div#tytusowe_buttony.m').append('<b style=color:red>Skrypt RGSC Advanced Friends Manager wymaga zalogowania!</b>');
            }
            //user zalogowany, mozna dzialac
            else
            {
                var pzBut = 'włączyć';
                var pzVal = 'show';

                if(localStorage.getItem('tt_pz') == 'show')
                {
                    pzBut = 'wyłączyć';
                    pzVal = 'hide';

                    //wlasciwe dzialania - tworzenie scapi, odswiezanie tokena, etc.
                    $('body').append('<iframe src=https://scapi.rockstargames.com/#'+getCookie('BearerToken')+' name=magicFrame id=workOnThis class=""></iframe>');

                    var ramka = $('iframe#workOnThis');
                    var tikTakToken = setInterval(function(){
                        var test = new XMLHttpRequest();
                        test.open("POST", location.origin+"/connect/refreshaccess", true);
                        test.setRequestHeader('X-Cache-Ver', 67);
                        test.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                        test.onreadystatechange = function(){
                            if(test.status == 200 && test.readyState == 4)
                            {
                                ramka.attr({
                                    'src': 'https://scapi.rockstargames.com/#'+getCookie('BearerToken'),
                                });
                                console.log('Token!');
                            }
                        }
                        var data = new FormData();
                        data.append('accessToken', getCookie('BearerToken'));
                        test.send(data);
                    }, 60000);

                    $('body').css({
                        'margin-bottom': '62px',
                        'width': '50%',
                    });
                    $('iframe#workOnThis').css({
                        'border': '3px #1a66ae inset',
                        'padding': '0',
                        'position': 'fixed',
                        'width': '50%',
                        'height': 'calc(100% - 60px)',
                        'top': '60px',
                        'bottom': '0',
                        //'left': '0',
                        'right': '0',
                        //'z-index': '999999',
                        //'display': 'none',
                        'background': '#000',
                    });
                }

                $('div#tytusowe_buttony.m').append('&nbsp;<button type=button id=pz_button class="getFriendsFiltered UI__Button-socialclub__btn UI__Button-socialclub__ghost UI__Button-socialclub__medium" onclick="return false;" style=margin-top:3px>Kliknij, aby <u>' + pzBut + '</u> Panel Zarządzania Znajomymi!</button>');
                $("body").on("mouseover", "button#pz_button", function(){ $(this).css('background', 'grey'); });
                $("body").on("mouseout", "button#pz_button", function(){  $(this).css('background', 'white'); });
                $("button#pz_button").css('background', 'white');
                $("body").on("click", "button#pz_button", function(){
                    localStorage.setItem('tt_pz', pzVal);
                    location.reload();
                });
            }
        }

        //scapi
        else if(location.hostname.substr(0,5) == 'scapi')
        {
            var myCrew, myCrewName;
            var basicProfile, myFriends, invitedByMe, invitedByThem;
            basicProfile = new XMLHttpRequest();
            myFriends = new XMLHttpRequest();
            invitedByMe = new XMLHttpRequest();
            invitedByThem = new XMLHttpRequest();

            document.write("<link rel='stylesheet' href='https://testertytus.ct8.pl/tampermonkey/rgsc_advanced_friends_manager.css'>");
            document.write("<link rel='stylesheet' href='https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css'>");
            document.write("<div id=topTopow></div>");
            $('div#topTopow').append("<button type=button class=bReload onclick='location.reload()'>ODŚWIEŻ W RAZIE DZIWNYCH ZJAWISK!</button><hr class=hrOne>");
            document.write("<div id=tableBox></div>");
            document.write("<div id=dialog-confirm></div>");

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
                $('table#'+this.className.substr(10)+' tr[class^="killHim"] input[type="checkbox"]').each(function(){
                    $(this).prop("checked",true).trigger("change");
                });
                $('table#'+this.className.substr(10)+' tr[class^="myCrew"] input[type="checkbox"]').each(function(){
                    $(this).prop("checked",false).trigger("change");
                });
                return false;
            });
            $("body").on("click", "button#fDeleter", function(){
                var mode = $(this).attr('class').substr(9);
                var mode2 = (mode=="invitedByThem_2" ? 'invitedByThem' : mode);

                var toDelete = [];
                var toWarn = [];
                $('table#'+mode2).find('input:checkbox:checked').each(function(){
                    var v = $(this).val();
                    toDelete.push(v);
                    toWarn.push( $("tr[class*='"+v+"'] td").eq(1).text() );
                });
                var howMany = toDelete.length;

                if(howMany == 0)
                {
                    dialog('alert', "<center style=color:red;font-weight:bold>!!! BŁĄD !!!<br>Nikogo nie zaznaczyłeś!</center>");
                    return false;
                }
                else
                {
                    var confirmFirst, reqUri;
                    switch(mode)
                    {
                        case "myFriendsTable":
                            confirmFirst = "<b style=color:red>Czy na pewno chcesz usunąć {0} znajomych? Operacji nie można cofnąć!</b><br><br><b>Znajomi wybrani do usunięcia:</b><br>{1}";
                            reqUri = "https://scapi.rockstargames.com/friends/remove?rockstarId={0}";
                            break;
                        case "invitedByMe":
                            confirmFirst = "<b style=color:red>Czy na pewno chcesz anulować {0} zaproszeń? Operacji nie można cofnąć!</b><br><br><b>Osoby, do których zaproszenia zostaną anulowane:</b><br>{1}";
                            reqUri = "https://scapi.rockstargames.com/friends/cancelInvite?rockstarId={0}&isMyOwnInvite=true";
                            break;
                        case "invitedByThem":
                            confirmFirst = "<b style=color:red>Czy na pewno chcesz odrzucić {0} zaproszeń? Operacji nie można cofnąć!</b><br><br><b>Osoby, których zaproszenia zostaną odrzucne:</b><br>{1}";
                            reqUri = "https://scapi.rockstargames.com/friends/cancelInvite?rockstarId={0}";
                            break;
                        case "invitedByThem_2": //accept invite
                            confirmFirst = "<b style=color:red>Czy na pewno chcesz <u>przyjąć</u> {0} zaproszeń? Operacji nie można cofnąć!</b><br><br><b>Osoby, które zostaną dodane do znajomych:</b><br>{1}";
                            reqUri = "https://scapi.rockstargames.com/friends/acceptInvite?rockstarId={0}";
                            break;
                        default:
                            dialog('alert', "<center style=color:red;font-weight:bold>!!! Błąd !!!<br>Nieznana operacja!</center>");
                            return false;
                            break;
                    }
                    dialog('confirm', confirmFirst.format('<u>'+howMany+'</u>', '<i>'+toWarn.join(', ')+'</i>'), manageFriends, [reqUri, toDelete]);
                }
            });
            $("body").on("change", "input[type='checkbox']", function(){
                var tid = $(this).attr('id');
                var csc = $('table#'+tid).find('input:checkbox:checked').length;
                $('span#fSelected_'+tid).text(csc);
                return false;
            });

            basicProfile.open("GET", "https://scapi.rockstargames.com/profile/getbasicprofile", true)
            setHead(basicProfile);
            basicProfile.send()

            basicProfile.onreadystatechange = function(){
                if(basicProfile.status == 200 && basicProfile.readyState == 4)
                {
                    var x = eval("[" + basicProfile.response + "][0].accounts[0].rockstarAccount");
                    myCrew = x.primaryClanId;
                    myCrewName = x.primaryClanTag;

                    myFriends.open("GET", "https://scapi.rockstargames.com/friends/getFriendsFiltered?onlineService=sc&nickname=&pageIndex=0&pageSize=250", true)
                    setHead(myFriends);
                    myFriends.send();
                }
                else if(basicProfile.status != 200 && basicProfile.readyState == 4) dialog('alert', "<center style=color:red;font-weight:bold>!!! Błąd !!!<br>Przałduja cała stronę! (F5 :])</center>");
            }

            myFriends.onreadystatechange = function(){
                writeTable(this, "myFriendsTable", "Znajomi", myCrew, myCrewName, invitedByMe, "GET", "https://scapi.rockstargames.com/friends/getInvitesSent?onlineService=sc&nickname=&pageIndex=0&pageSize=250");
            }
            invitedByMe.onreadystatechange = function(){
                writeTable(this, "invitedByMe", "Zaproszeni przeze mnie", myCrew, myCrewName, invitedByThem, "GET", "https://scapi.rockstargames.com/friends/getInvites");
            }
            invitedByThem.onreadystatechange = function(){
                writeTable(this, "invitedByThem", "Zaproszenia od innych", myCrew, myCrewName);
            }
        }
    });
})();