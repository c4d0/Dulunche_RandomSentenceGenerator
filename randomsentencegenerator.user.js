// ==UserScript==
// @name         RandomSentenceGenerator
// @namespace    http://tampermonkey.net/
// @version      0.7.1
// @description  generates random sentence, helps you come up with good ideas.
// @author       sqrl
// @license      MIT
// @match        *://www.youtube.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==


//要求独轮车版本 >= 2.20

(async function() {
    
    if (window.top !== window.self) throw new Error('非顶层框架');
    
    let isBusy = false;
    let wordsChinese = [];
    let wordsTone = ['！', '？'];
    let wordsLogic = ['虽然', '但是', '因为', '所以', '如果'];
    let dlcIsRunning = false;
    let dulunche = null;
    let translators = {}; //字典，key为标识符，value为translator对象
    
    let ui = {
        saveInput : function (){
            for (let i = 0; i < this.config.length; i++){
                let cfg = this.config[i];
                if (cfg.name != null && cfg.tag == 'input'){
                    switch (cfg.properties.type){
                        case 'checkbox':
                            GM_setValue(cfg.storage, this.elem[cfg.name].checked);
                            break;
                        default:
                            GM_setValue(cfg.storage, this.elem[cfg.name].value);
                            break;
                    }
                }
            }
        },
        loadInput : function (){
            for (let i = 0; i < this.config.length; i++){
                let cfg = this.config[i];
                if (cfg.name != null && cfg.tag == 'input'){
                    let loaded = null;
                    switch (cfg.properties.type){
                        case 'checkbox':
                            loaded = GM_getValue(cfg.storage);
                            this.elem[cfg.name].checked = loaded == null ? cfg.def : loaded;
                            break;
                        default:
                            loaded = GM_getValue(cfg.storage);
                            this.elem[cfg.name].value = loaded == null ? cfg.def : loaded;
                            break;
                    }
                    this.elem[cfg.name].dispatchEvent(new InputEvent('change'));
                }
            }
        },
        initialize : function(root, config){
            this.config = config;
            for (let i = 0; i < config.length; i++){
                let cfg = config[i];
                let ele = document.createElement(cfg.tag);
                if (cfg.name != null) this.elem[cfg.name] = ele;
                if (cfg.properties != null){
                    for (let k in cfg.properties){
                        switch(k){
                            case 'style':
                                for (let styleKey in cfg.properties.style){
                                    ele.style[styleKey] = cfg.properties.style[styleKey];
                                }
                                break;
                            default:
                                ele[k] = cfg.properties[k];
                                break;
                        }
                    }
                }
                root.appendChild(ele);
            }
        },
        elem : { }
    };
    let uiConfig = [
        {
            tag : 'span',
            properties : {
                innerHTML : '<b>垃圾话生成器 0.7.1</b>（alt+shift+R隐藏/显示界面）'
            }
        },
        { tag : 'br' },
        {
            tag : 'span',
            properties : {
                innerHTML : '鼠标悬停可以查看输入提示 '
            }
        },
        {
            tag : 'a',
            properties : {
                href : 'https://github.com/c4d0/Dulunche_RandomSentenceGenerator',
                target : '_blank',
                innerHTML : '打开github'
            }
        },
        { tag : 'br' },
        {
            tag : 'span',
            properties : {
                innerHTML : '主题：'
            }
        },
        {
            tag : 'input',
            name : 'insertWordBox',
            storage : 'insertWordBox',
            def : '垃圾 coco',
            properties : {
                type : 'text',
                id : 'laji_insertWordBox',
                title : '会随机插入到生成的文本中。多个词用空格隔开'
            }
        },
        { tag : 'br' },
        {
            tag : 'span',
            properties : {
                innerHTML : '翻译顺序：'
            }
        },
        {
            tag : 'input',
            name : 'translationOrderBox',
            storage : 'translationOrderBox',
            def : 'zh jp zh jp en',
            properties : {
                type : 'text',
                id : 'laji_translationOrderBox',
                title : '百度翻译的语言代码。例如：zh=简中 jp=日语 de=德语 ru=俄语 fra=法语 kor=韩语。\n空格隔开，生成时会从原文开始，按照这个顺序依次翻译得出结果'
            }
        },
        { tag : 'br' },
        {
            tag : 'span',
            properties : {
                innerHTML : '敏感词：'
            }
        },
        {
            tag : 'input',
            name : 'banWordBox',
            storage : 'banWordBox',
            def : 'bot report taiwan pizza',
            properties : {
                type : 'text',
                id : 'laji_banWordBox',
                title : '翻译完成后会从文本里删去这些词，避免触发敏感词封禁。正则表达式，忽略大小写'
            }
        },
        { tag : 'br' },
        {
            tag : 'span',
            properties : {
                innerHTML : '一次生成条数：'
            }
        },
        {
            tag : 'input',
            name : 'lineNumBox',
            storage : 'lineNumBox',
            def : '20',
            properties : {
                type : 'text',
                id : 'laji_lineNumBox',
                style : {
                    'width' : '50px'
                }
            }
        },
        { tag : 'br' },
        {
            tag : 'span',
            properties : {
                innerHTML : '每条中文词数：'
            }
        },
        {
            tag : 'input',
            name : 'wordNumBox',
            storage : 'wordNumBox',
            def : '10',
            properties : {
                type : 'text',
                id : 'laji_wordNumBox',
                style : {
                    'width' : '50px'
                }
            }
        },
        { tag : 'br' },
        {
            tag : 'span',
            properties : {
                innerHTML : '语气增强',
                title : '随机插入问号和感叹号'
            }
        },
        {
            tag : 'input',
            name : 'enhanceTone',
            storage : 'enhanceTone',
            def : false,
            properties : {
                type : 'checkbox',
                id : 'laji_enhanceTone',
                title : '随机插入问号和感叹号'
            }
        },
        { 
            tag : 'span',
            properties : {
                innerHTML : '&nbsp;&nbsp;'
            } 
        },
        {
            tag : 'span',
            properties : {
                innerHTML : '逻辑增强',
                title : '随机插入逻辑连接词'
            }
        },
        {
            tag : 'input',
            name : 'enhanceLogic',
            storage : 'enhanceLogic',
            def : false,
            properties : {
                type : 'checkbox',
                id : 'laji_enhanceLogic',
                title : '随机插入逻辑连接词'
            }
        },
        { 
            tag : 'span',
            properties : {
                innerHTML : '&nbsp;&nbsp;'
            } 
        },
        {
            tag : 'span',
            properties : {
                innerHTML : '强制小写',
                title : '强制转换成小写字母'
            }
        },
        {
            tag : 'input',
            name : 'forceLower',
            storage : 'forceLower',
            def : false,
            properties : {
                type : 'checkbox',
                id : 'laji_forceLower',
                title : '强制转换成小写字母'
            }
        },
        { tag : 'br' },
        {
            tag : 'span',
            properties : {
                innerHTML : '自动装填',
                title : '生成后自动填入独轮车\n【如果你没有独轮车或着想用其他工具，则可以把此选项关掉，手动复制生成的文本到你的工具中】'
            }
        },
        {
            tag : 'input',
            name : 'autoDLC',
            storage : 'autoDLC',
            def : false,
            properties : {
                type : 'checkbox',
                id : 'laji_autoDLC',
                title : '生成后自动填入独轮车\n【如果你没有独轮车或着想用其他工具，则可以把此选项关掉，手动复制生成的文本到你的工具中】',
                onchange : function (e){
                    ui.elem.dynamicReload.disabled = !ui.elem.autoDLC.checked;
                }
            }
        },
        { 
            tag : 'span',
            properties : {
                innerHTML : '&nbsp;&nbsp;'
            } 
        },
        {
            tag : 'span',
            properties : {
                innerHTML : '动态装填',
                title : '【适合长时间全自动挂机，如果用手动穿甲的话则没必要开】\n开启此选项后会强制覆盖dulunche的danmakuGener，在弹药消耗到一半时自动生成新的弹药'
            }
        },
        {
            tag : 'input',
            name : 'dynamicReload',
            storage : 'dynamicReload',
            def : false,
            properties : {
                type : 'checkbox',
                id : 'laji_dynamicReload',
                title : '【适合长时间全自动挂机，如果用手动穿甲的话则没必要开】\n开启此选项后会强制覆盖dulunche的danmakuGener，在弹药消耗到一半时自动生成新的弹药'
            }
        },
        { tag : 'br' },
        {
            tag : 'button',
            name : 'generateButton',
            properties : {
                innerHTML : '开始生成',
                id : 'laji_generateButton',
                title : '生成随机中文+多次翻译',
                onclick : async e=>{
                    if (isBusy) return;
                    isBusy = true;
                    ui.saveInput();
                    let original = ui.elem.generateButton.innerHTML;
                    ui.elem.generateButton.innerHTML = '...';
                    let numLines = Number(ui.elem.lineNumBox.value);
                    let numWords = Number(ui.elem.wordNumBox.value);
                    if (isNaN(numLines)) numLines = 20; 
                    if (isNaN(numWords)) numLines = 10; 
                    await asyncGenerate(numLines, numWords);
                    await asyncTranslate();
                    //fill DLC
                    if (ui.elem.autoDLC.checked) {
                        sendToDlc(ui.elem.resultText.value);
                    }
                    ui.elem.generateButton.innerHTML = original;
                    isBusy = false;
                }
            }
        },
        {
            tag : 'button',
            name : 'deeplButton',
            properties : {
                innerHTML : '用deepl打开',
                id : 'laji_deeplButton',
                title : '在新窗口中用deepl打开当前文本框的内容',
                onclick : async e=>{
                    openDeepl(ui.elem.resultText.value);
                }
            }
        },
        { tag : 'br' },
        {
            tag : 'textarea',
            name : 'resultText',
            properties : {
                id : 'laji_resultText',
                cols : 40,
                rows : 8,
                style : {
                    'min-width' : '180px',
                    'min-height' : '50px'
                }
            }
        }
    ];
    
    function cxhrAsync(url, method, dataStr){
        return new Promise(resolve => {
            GM_xmlhttpRequest({
                method: method,
                url: url,
                data: dataStr,
                headers:  {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                onload: function(res){
                    if(res.status === 200){
                        //console.log(res.responseText);
                        resolve(res.responseText);
                    }else{
                        console.log('error');
                        console.log(res);
                        resolve(null);
                    }
                },
                onerror : function(err){
                    console.log('error');
                    console.log(err);
                    resolve(null);
                }
            });
        });
    }
    
    //翻译器：百度翻译
    //必要的异步函数：initialize()和translate(content, from, to)
    //每当有东西需要翻译时就依次调用initialize和translate
    //为了统一格式，from和to就用百度翻译的语言代号，如果实现别的api可能需要做一个转换
    //可以照此实现别的翻译api
    let tokenReg = new RegExp("token:\\s'(\\S{32})'");
    let gtkReg = new RegExp("window.gtk\\s=\\s'(\\d{6}.\\d{9})';");
    let baiduFanyi = {
        initialized : false,
        currentToken : null,
        currentGtk : null,
        initialize : async function(){ //异步，当需要此翻译的时候被调用
            if (this.initialized) return;//只初始化一次
            console.log('initializing baiduFanyi');
            await this.fetchToken();
            setInterval(() => this.fetchToken(), 600 * 1000);//10分钟重新获取token
            this.initialized = true;
        },
        fetchToken : async function(){
            let page = await cxhrAsync('https://fanyi.baidu.com/', 'get', '');
            this.currentToken = tokenReg.exec(page)[1];
            this.currentGtk = gtkReg.exec(page)[1];
        },
        getSign : function(content){
            function a(r, o) {
                for (var t = 0; t < o.length - 2; t += 3) {
                    var a = o.charAt(t + 2);
                    a = a >= "a" ? a.charCodeAt(0) - 87 : Number(a),
                    a = "+" === o.charAt(t + 1) ? r >>> a: r << a,
                    r = "+" === o.charAt(t) ? r + a & 4294967295 : r ^ a
                }
                return r
            }
            var C = null;
            var token = function(r, _gtk) {
                var o = r.length;
                o > 30 && (r = "" + r.substr(0, 10) + r.substr(Math.floor(o / 2) - 5, 10) + r.substring(r.length, r.length - 10));
                var t;
                t = void 0,
                t = null !== C ? C: (C = _gtk || "") || "";
                for (var e = t.split("."), h = Number(e[0]) || 0, i = Number(e[1]) || 0, d = [], f = 0, g = 0; g < r.length; g++) {
                    var m = r.charCodeAt(g);
                    128 > m ? d[f++] = m: (2048 > m ? d[f++] = m >> 6 | 192 : (55296 === (64512 & m) && g + 1 < r.length && 56320 === (64512 & r.charCodeAt(g + 1)) ? (m = 65536 + ((1023 & m) << 10) + (1023 & r.charCodeAt(++g)), d[f++] = m >> 18 | 240, d[f++] = m >> 12 & 63 | 128) : d[f++] = m >> 12 | 224, d[f++] = m >> 6 & 63 | 128), d[f++] = 63 & m | 128)
                }
                for (var S = h,
                u = "+-a^+6",
                l = "+-3^+b+-f",
                s = 0; s < d.length; s++) S += d[s],
                S = a(S, u);

                return S = a(S, l),
                S ^= i,
                0 > S && (S = (2147483647 & S) + 2147483648),
                S %= 1e6,
                S.toString() + "." + (S ^ h)
            }
            return token(content, this.currentGtk);
        },
        translate : async function (content, from, to){
            let sign = this.getSign(content);
            let textres = await cxhrAsync(`https://fanyi.baidu.com/v2transapi?from=${from}&to=${to}`, 
            'post', `from=${from}&to=${to}&query=${encodeURIComponent(content)}&transtype=realtime&simple_means_flag=3&sign=${sign}&token=${this.currentToken}&domain=common`);
            if (textres == null) return null;
            let obj = eval(`(${textres})`);
            //console.log(obj);
            let resstr = '';
            obj.trans_result.data.forEach(line => resstr += line.dst + '\n');
            return resstr;
        },
        getLang : async function (content){
            let textres = await cxhrAsync('https://fanyi.baidu.com/langdetect', 'post', 'query=' + encodeURIComponent(content));
            let obj = eval(`(${textres})`);
            return obj.lan;
        },
    }
    
    //生成随机中文
    let asyncGenerate = async (numLines, numWords) => {//其实没有async...
        let insertWords = ui.elem.insertWordBox.value.split(' ');
        ui.elem.resultText.value = '';
        for (let i = 0; i < numLines; i++){
            let trashArr = randomFromWordList(wordsChinese, numWords);
            let j, insertPosition;
            for (j = 0; j < insertWords.length; j++){
                if (Math.random() > 1 - 0.02**(1.0 / insertWords.length)) continue;
                insertPosition = randomInt(0, trashArr.length + 1);
                trashArr.splice(insertPosition, 0, insertWords[j]);
            }
            if (ui.elem.enhanceTone.checked){
                let toneArr = randomFromWordList(wordsTone, randomInt(1, 3));
                for (j = 0; j < toneArr.length; j++){
                    insertPosition = [Math.floor(trashArr.length / 2), Math.floor(trashArr.length * 2 / 3), trashArr.length][randomInt(0, 3)];
                    trashArr.splice(insertPosition, 0, toneArr[j]);
                }
            }
            if (ui.elem.enhanceLogic.checked){
                let logicArr = randomFromWordList(wordsLogic, randomInt(1, 3));
                for (j = 0; j < logicArr.length; j++){
                    insertPosition = randomInt(0, trashArr.length / 2);
                    trashArr.splice(insertPosition, 0, logicArr[j]);
                }
            }
            trashArr.forEach(trash => ui.elem.resultText.value += trash);
            ui.elem.resultText.value += '\n';
        }
        //console.log(ui.elem.resultText.value);
    }
    
    //翻译
    let asyncTranslate = async () => {
        let translations = ui.elem.translationOrderBox.value.split(' ');
        while (translations.length > 0) {
            let thisLang = await baiduFanyi.getLang(ui.elem.resultText.value);
            let nextLang = translations.shift();
            if (thisLang == nextLang) continue;
            //console.log(`translating: ${thisLang} to ${nextLang}`);
            let translated = await baiduFanyi.translate(ui.elem.resultText.value, thisLang, nextLang);
            if (translated == null){
                console.log(`error translating: ${thisLang} to ${nextLang}`);
                break;
            }
            //console.log(translated);
            ui.elem.resultText.value = translated;
        }
        let banWords = ui.elem.banWordBox.value.split(' ');
        for (let i = 0; i < banWords.length; i++){
            //去除不允许的词 暂且这么处理
            ui.elem.resultText.value = ui.elem.resultText.value.replaceAll(new RegExp(banWords[i], 'gi'), '');
        }
        if (ui.elem.forceLower.checked){
            ui.elem.resultText.value = ui.elem.resultText.value.toLowerCase();
        }
        
    }
    
    
    //jump to deepl
    function openDeepl(content){
        window.open('https://www.deepl.com/en/translator#zh/en/' + encodeURIComponent(content));
    }
    
    function sendToDlc(text){
        if (dulunche != null){
            try{
                dulunche.config.text = text;
            }catch(e){
                console.log(e);
            }
            if (dlcIsRunning && ui.elem.dynamicReload.checked){
                //动态装填，覆盖独轮车的danmakuGener
                console.log('randomsentencegenerator: overriding danmakuGener');
                let splitText = text.split('\n');
                let splitFiltered = [];
                let currentIndex = 0;
                let sentCount = 0;
                splitText.forEach(i => {
                    if (i.length > 0){
                        splitFiltered.push(i);
                    }
                });
                //覆盖danmakuGener
                dulunche.refs.danmakuGener = (function*(){
                    while(true){
                        if (splitFiltered.length == 0) {
                            ui.elem.generateButton.click();
                            yield '';
                        }
                        else{
                            if (dulunche.config.randomDanmaku){
                                sentCount++;
                                yield splitFiltered[randomInt(0, splitFiltered.length)];
                            }
                            else{
                                currentIndex++;
                                sentCount++;
                                if (currentIndex >= splitFiltered.length) currentIndex = 0;
                                yield splitFiltered[currentIndex]; 
                            }
                            if (sentCount > splitFiltered.length / 2 && sentCount > 1){
                                ui.elem.generateButton.click();
                            }
                        }
                    }
                })();
            }
        }
    }
    
    //下载词库
    async function getWordList(url){
        let raw = await cxhrAsync(url, 'get', '');
        return raw.split('\n');
    }
    
    function randomInt(from, to){
        return Math.floor(Math.random() * (to - from) + from);
    }
    
    function randomFromWordList(wordList, numWords){
        let res = [];
        for (let i = 0; i < numWords; i++){
            res.push(wordList[Math.floor(Math.random()**2 * wordList.length)]);
        }
        return res;
    }
    
    //注入代码
    let insertScript = function(script){
        //console.log(script);
        let scriptElem = document.createElement('script');
        scriptElem.innerHTML = script;
        document.body.appendChild(scriptElem);
    }
    
    //注入函数
    let insertFunction = function(globalName, params, func){
        let eventName = globalName + '_userevent' + randomInt(10000000, 99999999);
        document.addEventListener(eventName, async e => {
            //console.log(e);
            let promise = func.apply(window, e.params);
            e.resolve(await promise);
        });
        insertScript(`
            window.${globalName} = function(${params}){
                return new Promise(resolve =>{
                    let event = document.createEvent('HTMLEvents');
                    event.initEvent('${eventName}', true, true);
                    event.params = Array.from(arguments);
                    event.resolve = resolve;
                    document.dispatchEvent(event);
                });
            }
        `);
    }
    
    //异步，从外面取值
    let globalEval = function(code){
        return new Promise(resolve => {
            insertFunction('laji_passObject', 'obj', o => {
                resolve(o);
            });
            insertScript(`
                (() => {
                    try{
                        laji_passObject(eval("${code}"));
                    }
                    catch(e){
                        console.log(e);
                        laji_passObject(null);
                    }
                    finally{
                        window.laji_passObject = undefined;
                    }
                })()
            `);
        });
    }
    
    insertFunction('laji_baiduFanyiTranslateAsync', 'text, from, to', async(content, from, to) => await baiduFanyi.translate(content, from, to));
    insertFunction('laji_baiduFanyiDetectLangAsync', 'text', async(content) => await baiduFanyi.getLang(content));
    insertFunction('laji_cxhrAsync', 'url, method, dataString', cxhrAsync)
    insertFunction('laji_GenerateAndTranslate', '', () => ui.elem.generateButton.click());
    insertFunction('laji_OpenDeepl', '', () => ui.elem.deeplButton.click());
    
    
    //load wordlist
    console.log('get wordlist');
    //wordsEnglish = await getWordList('https://github.com/first20hours/google-10000-english/raw/master/google-10000-english-no-swears.txt');
    wordsChinese = await getWordList('https://gist.github.com/c4d0/47b712b20ac1f85724048d500909d1cc/raw/904236c3c1fecf348b9757b7d705ac9ba40bf655/chinese_10000words');
    
    
    baiduFanyi.initialize();
    
    
    //setup ui
    let smallWindow = document.createElement('div');
    smallWindow.id = 'laji_root';
    smallWindow.style['position'] = 'fixed';
    smallWindow.style['left'] = '0';
    smallWindow.style['top'] = '0';
    //smallWindow.style['width'] = '200px';
    //smallWindow.style['height'] = '100px';
    smallWindow.style['background-color'] = '#fff';
    smallWindow.style['border-width'] = '2px';
    smallWindow.style['border-style'] = 'solid';
    smallWindow.style['border-color'] = '#888';
    smallWindow.style['border-radius'] = '5px';
    smallWindow.style['padding'] = '4px';
    smallWindow.style['z-index'] = '100000';
    smallWindow.style['display'] = 'none';
    smallWindow.style['user-select'] = 'none';
    ui.initialize(smallWindow, uiConfig);
    ui.loadInput();
    document.body.appendChild(smallWindow); 
    console.log(ui);
    
    
    
    //drag window
    let startX = 0, startY = 0;
    let currentX = 0, currentY = 0;
    let isMouseDown = false;
    smallWindow.addEventListener('mousedown', e =>{
        if (e.target.tagName == "TEXTAREA" || e.target.tagName == "BUTTON" || e.target.tagName == "INPUT") return;
        startX = e.pageX;
        startY = e.pageY;
        isMouseDown = true;
    });
    document.addEventListener('mousemove', e =>{
        if (!isMouseDown) return;
        currentX += e.pageX - startX;
        currentY += e.pageY - startY;
        startX = e.pageX;
        startY = e.pageY;
        smallWindow.style['left'] = currentX + 'px';
        smallWindow.style['top'] = currentY + 'px';
        
    });
    document.addEventListener('mouseup', e =>{
        isMouseDown = false;
    });
    
    //hotkey
    document.addEventListener('keydown', e =>{
        if (e.keyCode == 82 && e.altKey && e.shiftKey){
            smallWindow.style['display'] = smallWindow.style['display'] == 'none' ? '' : 'none';
        }
    });
    
    smallWindow.style['display'] = '';
    
    //获取独轮车接口
    dulunche = await globalEval('window.dulunche');
    if (dulunche != null){
        dulunche.eventBus.on('dlc.run', ()=>{
            dlcIsRunning = true;
            if (ui.elem.autoDLC.checked && ui.elem.dynamicReload.checked) {
                sendToDlc(ui.elem.resultText.value);
            }
        });
        dulunche.eventBus.on('dlc.stop', ()=>{
            dlcIsRunning = false;
        });
    }
    else{
        console.log('randomsentencegenerator: 未找到独轮车');
    }
    
    
})();
