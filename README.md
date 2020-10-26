# Dulunche_RandomSentenceGenerator

油猴脚本，配合[独轮车](https://greasyfork.org/zh-CN/scripts/412464-youtube%E7%8B%AC%E8%BD%AE%E8%BD%A6-auto-youtube-chat-sender)用

随机生成弹药，可以一定程度避免对面sj弹药库

# 安装

**注意：从0.7版本开始使用了新版独轮车提供的接口，更新时请确保独轮车版本大于等于2.20**

从openuserjs.org安装

- [RandomSentenceGenerator](https://openuserjs.org/scripts/sqrl/RandomSentenceGenerator)

或直接从github下载

- [当前版本 0.7](https://github.com/c4d0/Dulunche_RandomSentenceGenerator/raw/main/randomsentencegenerator.user.js)
- [0.6](https://github.com/c4d0/Dulunche_RandomSentenceGenerator/raw/main/legacy/randomsentencegenerator_v0.6.user.js)

# 原理

从一个[中文词库](https://gist.github.com/c4d0/47b712b20ac1f85724048d500909d1cc)里面随机选出词语组合成句子，再白嫖百度翻译的api反复翻译，就能把语法理顺。

通过随机插入给定词语，可以让生成的结果和给定的主题相关，乍一看很有道理但是实际上狗屁不通（手动ac娘表情）

# 使用方法

打开youtube，等加载完词库即可看到界面，shift+r可以切换界面显示

- 主题：会随机插入到生成的文本中。多个词用空格隔开
- 翻译顺序：百度翻译的语言代码。例如：zh=简中 jp=日语 de=德语 ru=俄语 fra=法语 kor=韩语。空格隔开，生成时会从原文开始，按照这个顺序依次翻译得出结果
- 敏感词：翻译完成后会从文本里删去这些词，避免触发敏感词封禁。正则表达式，忽略大小写
- 一次生成条数、每条长度：不解释
- 语气增强：随机插入问号和感叹号
- 逻辑增强：随机插入逻辑连接词
- 自动装填：生成后自动填入独轮车（如果你没有独轮车或着想用其他工具，则可以把此选项关掉，手动复制生成的文本到你的工具中）
- 动态装填：开启此选项后会强制覆盖dulunche的danmakuGener，在弹药消耗到一半时自动生成新的弹药（适合长时间全自动挂机，如果用手动穿甲的话则没必要开）


![scr1](https://github.com/c4d0/Dulunche_RandomSentenceGenerator/raw/main/img/2020-10-26_11-38-26_chrome.png)

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

# Changelog

## v0.7
- 优化ui
- 增加了动态装填，可以全自动挂机
- 优化了语气增强的插入位置，避免打破句子的连续性

## v0.6
- 优化ui
- 增加了语气增强和逻辑增强

