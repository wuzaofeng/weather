import * as echarts from '../../ec-canvas/echarts';
import * as Type from '../../server/type.js'
import Request from '../../utils/request.js'
import QQMapWX from '../../libs/qqmap-wx-jssdk.min.js'
import { getCity } from '../../utils/util.js'

const QQMap = new QQMapWX({
  key: 'IGNBZ-Y6PK6-ALQSA-EQENE-EAKWE-WJB3B' // key
})

Page({
  data: {
    ec: {
      lazyLoad: true
      // onInit: initChart
    },
    address: [{
      name: 'i',
      attrs: {
        class: 'iconfont icon-address',
      }
    }, {
      name: 'span',
      attrs: {
        class: 'address_text',
      },
      children: [{
        type: 'text',
        text: ''
      }]
    }, {
      name: 'i',
      attrs: {
        class: 'iconfont icon-arrow',
      },
    }],
    cityCode: '',
  },
  onReady() {
    this.echartsCom = this.selectComponent('#chart-dom');  
  },
  onLoad() {
    this.getLocal()
  },
  getLocal() {
    const _this = this
    wx.getLocation({
      success({ latitude, longitude }) {
        const data = {
          lat: latitude,
          lon: longitude,
        }
        _this.getLocalDetail(data)
      }
    })
  },
  // 获取当前地址的早晚天气详情
  getLocalDetail(data) {
    const _this = this
    Request({
      url: Type.LocalDetails,
      data,
      success(res) {
        const date = res.header.Date
        const { result } = res.data
        _this.setData({
          paHtml: `<i class="iconfont icon-stress"></i><span class="text">${result.pa}Pa</span>`,
          day: {
            temp: result.dayTemp,
            weatherDes: result.dayWeatherDes,
          },
          night: {
            temp: result.nightTemp,
            weatherDes: result.nightWeatherDes,
          }
        })

        _this.reverseGeocoder(result.lat, result.lon)
      }
    })
  },
  // 解析坐标
  reverseGeocoder(latitude, longitude) {
    const _this = this
    QQMap.reverseGeocoder({
      location: {
        latitude,
        longitude
      },
      success(res) {
        const { result: { address_component: { city, district, street_number } } } = res
        const _city = getCity(city)
        _this.getRecently(_city.id)
        _this.setData({
          'address[1].children[0].text': `${district} ${street_number} `
        })
      }
    })
  },
  // 获取近日天气
  getRecently(citycode) {
    const _this = this
    const data = {citycode}
    Request({
      url: Type.Recently,
      data,
      success(res) {
        const { fc40, fc1h_24 } = res.data
        const { jh } = fc1h_24
        // 获取今天温度
        let dateHtml = '<span class="new">'
        dateHtml += + fc40[0]['009'].substring(4, 6) + '月' + fc40[0]['009'].substring(6, 8) + '日'
        dateHtml += '</span>'
        dateHtml += '<span class="old">(' + fc40[0]['010']
        dateHtml += ')</span>'
        _this.setData({
          dateHtml,
          tempHtml: `<span class="text">${jh[0].jb}°</span>`,
          waterHtml: `<i class="iconfont icon-water"></i><span class="text">${jh[0].je}%</span>`,
          hours: jh
        })
        _this.getTianQiApi(citycode)
      },
    })
  },
  // 获取天气api
  getTianQiApi(citycode) {
    const _this = this
    const data = {
      version: 'v1',
      cityid: citycode,
    }
    Request({
      url: Type.TianQiApi,
      data,
      success(res) {
        const _data = res.data.data
        const tips = _data[0].air_tips
        const levelColor = _this.levelColor(_data[0].air_level)
        let html = `<i class="iconfont icon-notice"></i><span class="text">${tips}</span>`
        _this.setData({
          airtipsHtml: html,
          weatherDes: _data[0].wea,
          scoreHtml: `
          <div class="con ${levelColor}">
            <i class="iconfont icon-leaf"></i>
            <span>${_data[0].air}${_data[0].air_level}</span>
          </div>`,
          windHtml: `<i class="iconfont icon-wind"></i><span class="text">${_this.formatWinSpeed(_data[0].win_speed)}</span>`,
          dayHtml: `
          <div class="text">
            <span class="name">白天<i class="icon ${levelColor}">${_data[0].air_level}</i></span>
            <span class="temp">${_this.data.day.temp}°C</span>
          </div>
          <div class="text2">
            <span class="name">${_this.data.day.weatherDes}</span>
          </div>`,
          nightHtml: `<div class="text">
            <span class="name">晚上<i class="icon ${levelColor}">${_data[0].air_level}</i></span>
            <span class="temp">${_this.data.night.temp}°C</span>
          </div>
          <div class="text2">
            <span class="name">${_this.data.night.weatherDes}</span>
          </div>
          `,
        })
        _this.initEchart(_data[0])
      }
    })
  },
  levelColor (level) {
    let color = ''
    switch(level) {
      case "优":
        color = 'green'
        break;
      default:
        color = 'yellow'
    }
    return color
  },
  formatWinSpeed(speed) {
    let _speed = Number(speed[1]) - 1
    if (isNaN) {
      _speed = Number(speed[0]) - 1
    }
    return _speed + '级'
  },
  initEchart(data) {
    const { tem1: max, tem2: min, hours } = data
    const _hours = this.formatHours(hours)
    this.echartsCom.init((canvas, width, height) => {
      const _this = this
      const chart = echarts.init(canvas, null, {
        width: width * 1.5,
        height: height
      });
      const option = {
        title: { show: false },
        color: ["#add8fd"],
        grid: {
          containLabel: true,
          left: '0',
          top: '30px',
          right: '0',
          bottom: '20px'
        },
        xAxis: {
          type: 'category',
          axisTick: false,
          boundaryGap: false,
          data: _hours.map(i => ({
            ...i,
            value: i.xData
          })),
          axisLine: {
            show: false,
            lineStyle: {
              color: '#a9a9a9'
            }
          },
          axisLabel: {
            interval: 0,//横轴信息全部显示
            rotate: -30 //-30度角倾斜显示
          }
        },
        yAxis: {
          x: 'center',
          type: 'value',
          axisTick: false,
          splitLine: false,
          splitNumber: 2,
          axisLine: false,
          axisLabel: {
            show: false,
            inside: true
          },
          min: Number(_this.formatTemp(min)) - 3
        },
        series: [{
          name: 'temp',
          type: 'line',
          smooth: true,
          areaStyle: {
            color: "#add8fd"
          },
          label: {
            show: true,
            formatter: function (item) {
              return item.value + '°C'
            }
          },
          data: _hours.map((i, index) => ({
            ...i,
            value: i.temp,
            label: {
              offset: index === 0 ? [13, 0] : [10, 0]
            },
          }))
        }]
      };

      chart.setOption(option)
      this.chart = chart;
      return chart;
    });
  },
  formatHours(tqHours) {
    const _recHours = this.data.hours
    const hours = []
    for(let i=0; i< _recHours.length; i++) {
      if (i >= 24) {
        break;
      }
      const _recitem = _recHours[i]
      const { jb, jf } = _recitem
      const _recTime = Number(jf.substring(8, 10))
      let xData = (_recTime === 0 && i !== 0) ? '明天' : _recTime + ':00'
      hours.push({
        temp: Number(_recitem.jb),
        time: _recitem.jf,
        xData
      })
    }
    return hours
  },
  formatTemp(temp) {
    return temp.replace(/[^0-9]/ig, "")
  }
})
