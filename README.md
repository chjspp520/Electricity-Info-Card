### Home Assistant 用电信息卡片 (Electricity Info Card)

electricity-info-card 是一个高度可定制、功能丰富的用电信息展示卡片。它以美观的视觉设计和交互式图表，全面展示家庭用电的各类数据，同时各类信息都可以随心所欲的控制是否显示。其内置light（亮色）、dark（暗色）、black、power（国家电网主题）、transparent（半透明）、blue、green、red、purple、yellow、cyan、pink、orange 等12种主题，可根据时间、设备自动切换主题等。




## ✨ 功能特性
# 📊 数据展示
实时余额显示 - 清晰展示当前电费余额

阶梯电价可视化 - 三种阶梯用电量区间直观展示

分时用电分析 - 尖、峰、平、谷各时段用电量分布

本月/上月/年度统计 - 多维度的用电数据对比

多种图标展示

## 📸 界面预览

<div style="display: flex; justify-content: space-around; align-items: center; flex-wrap: wrap;">
  <img src="https://github.com/chjspp520/Electricity-Info-Card/blob/main/%E4%B8%BB%E7%95%8C%E9%9D%A2.gif" alt="截图" style="width: 48%; height: auto; margin: 5px;">
  <img src="https://github.com/chjspp520/Electricity-Info-Card/blob/main/%E6%9C%80%E5%B0%8F%E6%A8%A1%E5%BC%8F.png" alt="截图" style="width: 48%; height: auto; margin: 5px;">
  <img src="https://github.com/chjspp520/Electricity-Info-Card/blob/main/%E5%85%A8%E5%8A%9F%E8%83%BD%E6%BC%94%E7%A4%BA.gif" alt="截图" style="width: 100%; height: auto; margin: 5px;">  
  
# 🎨 自定义配置
阶梯电价配置 - 支持自定义各阶梯电量和价格

计费周期设置 - 灵活配置计费周期（如：7.1-6.30）

颜色主题定制 - 支持卡片背景色自定义

显示元素控制 - 可选择性显示/隐藏各项内容

# 📱 响应式设计
自适应布局，在不同设备上均有良好显示效果

平滑的动画过渡效果

直观的视觉指示器

# 🏷️ 版本说明

v2.0.3

2026年1月23日新增以下功能

1、优化图表显示（电量、金额的轴刻度显示、图例修改）；

2、卡片正常显示的最小宽度为360px；

3、去掉三个按钮中数值的背景阴影，显示更清晰；

4、新增纯黑主题（black）；

5、新增主题切换跟随时间（time）和设备（phone）；6:00-18:00 为白天，其他为晚上

6、新增卡片配置项（dark_light_theme）指定暗色和亮色主题，当跟随时间、跟随设备、on/off时使用dark_light_theme的配置来切换暗色和亮色。


总体来说，主要修改通过dark_light_theme配置项来自定义暗色和亮色，在需要切换时（theme值或者实体为time、phone、on、off）根据参数来切换

----------------------------------------------------------------------------------------------------------------------------------

V2.0.1

2026年1月22日更新

1、优化了UI布局，修正了阶梯指示器超出卡片外部（Mr.G先生完成，在此表示感谢）。

2、主题配置新增time（跟随时间切换亮色和暗色）、phone（跟随手机系统或者浏览器切换亮色和暗色），当不配置theme时会使用默认的power主题。

3、图表细节优化。

# 🛠️ 安装方法

有可用的用电信息传感器实体，使用xiaoshi的国家电网辅助实体，或者符合以下数据格式要求的也可以
```yaml
date: "2025-12-18 10:49:11"
daylist:
  - day: "2025-12-17"
    dayEleNum: 11.25
    dayEleCost: 6.08
    dayTPq: 0
    dayPPq: 5.09
    dayNPq: 3.58
    dayVPq: 2.56
monthlist:
  - month: 2025-12
    monthEleNum: 187.4
    monthEleCost: 100.47
    monthTPq: 0
    monthPPq: 77.61
    monthNPq: 63.19
    monthVPq: 46.58
yearlist:
  - year: "2025"
    yearEleNum: 4237.4
    yearEleCost: 2272.34
    yearTPq: 0
    yearPPq: 1748.95
    yearNPq: 1349.07
    yearVPq: 1029.04
```        
## 安装步骤
将 electricity-info-card.js 文件放入 Home Assistant 的 www 目录

在 Lovelace 配置中添加资源引用：
```yaml
resources:
  - url: /local/electricity-info-card.js
    type: module
```
#  ⚙️ 配置选项

```yaml
type: custom:electricity-info-card
entity: sensor.electricity_info
dark_light_theme: black,red   #可选，自定义暗色和亮色主题名称，在使用 `time`、`phone` 或实体 `on/off` 状态时，必须先配置 `dark_light_theme`
name: 家庭用电
hide:   #可选，值见下表，意思是要隐藏的要素，可填写多个，具体见后
theme: input_select.theme     #可选配置，可以是实体，也可以是文本(也可以填写为on/off)，实体支持两种，一种为开关类，如果填写开关类则只会在亮色和暗色间切换；一种是下拉型实体，可选值为：light、dark、power、transparent、blue、green、red、purple、yellow、cyan、pink、orange、time（跟随时间切换亮色和暗色）、phone（跟随手机系统或者浏览器切换亮色和暗色）
tier1_max: 2160              #第一阶梯最大值
tier1_price: 0.4983         #第一阶梯单价
tier2_max: 4200            #第二阶梯最大值
tier2_price: 0.5483         #第二阶梯单价
tier3_price: 0.7983         #第三阶梯单价
billing_cycle: 7.1-6.30    #阶梯周期，填写月日
device_entity:                                                                    #可选，用电设备
  - entity: light.ertongfang_xidingdeng                                 #实体ID
    name: 儿童房主灯                                                         #实体名称
    power: 50                                                                    #可选，功率值，如果填写此项会根据此项计算用电量，计算方法为 power x 时长 /1000
  - entity: climate.xiaomi_cn_572101627_m6
    name: 儿童房空调
    on_state: cool,dry,fan_only,heat                                     #可选，定义开启状态值，可以为多项
  - entity: switch.giot_cn_1126348886_v64ksm_on_p_4_1
    name: 洗衣机
    power_entity: sensor.xiyiji_day                                       #可选，用电量实体

//===========================hide隐藏项说明=============================//
electricity-price-display        电价显示区域        
remaining-days-display        剩余天数显示区域
tier-indicator                        阶梯指示器
time-distribution-bar                分时用电条
data-container                        统计数据容器
user-info                                标题
pie-chart-section                       饼图
timeline-container              设备时间线容器
calendar-stats                      日历统计信息
```

