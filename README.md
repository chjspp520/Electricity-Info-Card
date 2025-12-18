### Home Assistant 用电信息卡片 (Electricity Info Card)
一个功能强大且高度可自定义的 Home Assistant 自定义卡片，用于直观展示用电信息、阶梯电价和分时用电数据。




## ✨ 功能特性
# 📊 数据展示
实时余额显示 - 清晰展示当前电费余额

阶梯电价可视化 - 三种阶梯用电量区间直观展示

分时用电分析 - 尖、峰、平、谷各时段用电量分布

本月/上月/年度统计 - 多维度的用电数据对比

## 📸 界面预览

<div style="display: flex; justify-content: space-around; align-items: center; flex-wrap: wrap;">
  <img src="https://github.com/chjspp520/Electricity-Info-Card/blob/main/%E6%9C%80%E5%A4%A7%E6%A8%A1%E5%BC%8F.png" alt="截图" style="width: 48%; height: auto; margin: 5px;">
  <img src="https://github.com/chjspp520/Electricity-Info-Card/blob/main/%E6%9C%80%E5%B0%8F%E6%A8%A1%E5%BC%8F.png" alt="截图" style="width: 48%; height: auto; margin: 5px;">
  <img src="https://github.com/chjspp520/Electricity-Info-Card/blob/main/%E6%BC%94%E7%A4%BA.gif" alt="截图" style="width: 100%; height: auto; margin: 5px;">  
  
# 🎨 自定义配置
阶梯电价配置 - 支持自定义各阶梯电量和价格

计费周期设置 - 灵活配置计费周期（如：7.1-6.30）

颜色主题定制 - 支持卡片背景色自定义

显示元素控制 - 可选择性显示/隐藏各项内容

# 📱 响应式设计
自适应布局，在不同设备上均有良好显示效果

平滑的动画过渡效果

直观的视觉指示器

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
entity: sensor.electricity_info      # 必需：用电信息传感器实体
name: 用电信息                      # 可选：卡片标题
background: '#f0f8ff'  # 十六进制颜色   或者 background: 'rgba(240, 248, 255, 0.9)'  # rgba模式   或者 background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'  # 渐变色
show_name: true                     # 是否显示名称（默认：true）
show_time_distribution: true        # 是否显示分时用电条（默认：true）
show_tier_content: true            # 是否显示阶梯详情（默认：true）
billing_cycle: 7.1-6.30            #阶梯周期
tier1_max: 2160                     # 第一阶梯最大电量（度）
tier1_price: 0.4983                # 第一阶梯电价（元/度）
tier2_max: 4200                     # 第二阶梯最大电量（度）
tier2_price: 0.5483                # 第二阶梯电价（元/度）
tier3_price: 0.7983                # 第三阶梯电价（元/度）
```

