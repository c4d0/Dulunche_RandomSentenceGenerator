# Dulunche_RandomSentenceGenerator

油猴脚本，配合独轮车用

随机生成弹药，可以一定程度避免对面sj弹药库

# 安装
[当前版本 0.6](https://github.com/c4d0/Dulunche_RandomSentenceGenerator/raw/main/randomsentencegenerator.user.js)

# 使用
打开youtube，等加载完词库即可看到界面，shift+r可以切换界面显示

- 主题：会随机插入到生成的文本中。多个词用空格隔开
- 翻译顺序：百度翻译的语言代码。例如：zh=简中 jp=日语 de=德语 ru=俄语 fra=法语 kor=韩语。空格隔开，生成时会从原文开始，按照这个顺序依次翻译得出结果
- 敏感词：翻译完成后会从文本里删去这些词，避免触发敏感词封禁。正则表达式，忽略大小写
- 一次生成条数、每条长度：不解释
- 语气增强：随机插入问号和感叹号
- 逻辑增强：随机插入逻辑连接词
- 自动装填：生成后自动填入[独轮车](https://greasyfork.org/zh-CN/scripts/412464-youtube%E7%8B%AC%E8%BD%AE%E8%BD%A6-auto-youtube-chat-sender)

![scr1](https://github.com/c4d0/Dulunche_RandomSentenceGenerator/raw/main/2020-10-25_18-49-14_chrome.png)

放一张增强全开的生成结果图

![scr1](https://github.com/c4d0/Dulunche_RandomSentenceGenerator/raw/main/2020-10-25_18-49-20_chrome.png)

# 二次开发

一些操作已经注入到了全局变量中，可以直接控制台调用。
``` js
//异步函数要拿返回值的话记得用await
laji_GenerateAndTranslate() //相当于点击生成按钮
laji_OpenDeepl() //相当于点击打开deepl按钮
laji_baiduFanyiTranslateAsync(text, from, to) //百度翻译文字
laji_baiduFanyiDetectLangAsync(text) //百度检测文字语言
laji_cxhrAsync(url, method, dataString) //跨域请求
```

示例：定时每60秒重新生成
``` js
var id = setInterval(() => laji_GenerateAndTranslate(), 60 * 1000);
//如果要停止定时器，输入 clearInterval(id);
```
