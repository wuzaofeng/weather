import * as echarts from '../../ec-canvas/echarts';
import * as Type from '../../server/type.js'
import Request from '../../utils/request.js'
import QQMapWX from '../../libs/qqmap-wx-jssdk.min.js'
import queryWeather from '../../libs/weather.js'
import { getCity } from '../../utils/util.js'

const app = getApp(); 
const QQMap = new QQMapWX({
  key: 'IGNBZ-Y6PK6-ALQSA-EQENE-EAKWE-WJB3B' // key
})

Page({
  data: {
    ec: {
      lazyLoad: true
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
    daysWidth: '',
    indexState: false,
    indexLength: 8,
    currentAlarm: 0,
    lunCalender: ''
  },
  onLoad() {
    this.echartsCom = this.selectComponent('#chart-dom');
    this.tempEchartsCom = this.selectComponent('#temp-echart');
    this.getLocal()
  },
  getLocal() {
    wx.getLocation({
      success:({ latitude, longitude }) => {
        const data = {
          lat: latitude,
          lon: longitude,
        }
        this.getLocalDetail(data)
      }
    })
  },
  // 获取当前地址的早晚天气详情
  getLocalDetail(data) {
    Request({
      url: Type.LocalDetails,
      data,
      success:(res) => {
        const date = res.header.Date
        const { result } = res.data
        this.setData({
          paHtml: `<i class="iconfont icon-stress"></i><span class="text">${result.pa}hPa</span>`,
          day: {
            temp: result.dayTemp,
            weatherDes: result.dayWeatherDes,
            windDirection: result.dayWindDirection
          },
          night: {
            temp: result.nightTemp,
            weatherDes: result.nightWeatherDes,
            windDirection: result.nightWindDirection
          }
        })

        this.reverseGeocoder(result.lat, result.lon)
      }
    })
  },
  // 解析坐标
  reverseGeocoder(latitude, longitude) {
    QQMap.reverseGeocoder({
      location: {
        latitude,
        longitude
      },
      success:(res) => {
        const { result: { address_component: { city, district, street_number } } } = res
        const _city = getCity(city)
        this.getRecently(_city.id)
        this.getLocalInfo(_city.id)
        this.setData({
          'address[1].children[0].text': `${district} ${street_number} `,
          citycode: _city.id
        })
      }
    })
  },
  // 获取近日天气
  getRecently(citycode) {
    const data = {
      citycode
    }
    Request({
      url: Type.Recently,
      data,
      success:(res) => {
        const { fc40, fc1h_24, index3d } = res.data
        const { jh } = fc1h_24
        this.setData({
          tempHtml: `<span class="text">${jh[0].jb}°</span>`,
          waterHtml: `<i class="iconfont icon-water"></i><span class="text">${jh[0].je}%</span>`,
          sunHtml: `<i class="iconfont icon-sunrise"></i><span class="text">${fc40[0]['014']}<span><i class="iconfont icon-sunset"></i><span class="text">${fc40[0]['015']}<span>`,
          hours: jh,
          fc40,
          index3d: this.formatIndex(index3d, fc40[0]['010'])
        })
        this.getTianQiApi(citycode)
      },
    })
  },
  // 获取天气api
  getTianQiApi(citycode) {
    const data = {
      version: 'v1',
      cityid: citycode,
    }
    Request({
      url: Type.TianQiApi,
      data,
      success:(res) => {
        const _data = res.data.data
        const tips = _data[0].air_tips
        const levelColor = this.levelColor(_data[0].air_level)
        const { daysWidth, new7Day } = this.format7Day(_data)
        let html = `<i class="iconfont icon-notice"></i><span class="text">${tips}</span>`
        this.setData({
          airtipsHtml: html,
          weatherDes: _data[0].wea,
          scoreHtml: `
          <div class="con ${levelColor}">
            <i class="iconfont icon-leaf"></i>
            <span>${_data[0].air}${_data[0].air_level}</span>
          </div>`,
          windHtml: `<i class="iconfont icon-wind"></i><span class="text">${this.formatWinSpeed(_data[0].win_speed)}</span>`,
          dayHtml: `
          <div class="text">
            <span class="name">白天<i class="icon ${levelColor}">${_data[0].air_level}</i></span>
            <span class="temp">${this.data.day.windDirection}/${this.data.day.temp}°C</span>
          </div>
          <div class="text2">
            <span class="name">${this.data.day.weatherDes}</span>
             <img class="we-icon" src="../../images/weather/${queryWeather(this.data.night.weatherDes, 'd').image}.png" />
          </div>`,
          nightHtml: `<div class="text">
            <span class="name">晚上<i class="icon ${levelColor}">${_data[0].air_level}</i></span>
            <span class="temp">${this.data.night.windDirection}/${this.data.night.temp}°C</span>
          </div>
          <div class="text2">
            <span class="name">${this.data.night.weatherDes}</span>
            <img class="we-icon" src="../../images/weather/${queryWeather(this.data.night.weatherDes, 'n').image}.png" />
          </div>
          `,
          day7: new7Day,
          daysWidth 
        })
        
        this.initEchart(_data[0])
        this.init7DayEchart(new7Day)
      }
    })
  },
  getLocalInfo(citycode) {
    const data = {
      citycode
    }
    Request({
      url: Type.LocalInfo,
      data,
      success: (res) => {
        const arr = res.data[`alarmDZ${citycode}`].w
        const gradeObj = { "01": 'blue', "02": 'yellow', "03": 'orange', "04": 'red', "91": 'white' }
        const length = arr.length
        const alarm = arr.map(i => {
          let color = ''
          if (i.w6 == "00") {
            color = i.w7 == "蓝色" && 'blue' || i.w7 == "黄色" && 'yellow' || i.w7 == "橙色" && 'orange' || i.w7 == "红色" && 'red' || '';
          } else {
            color = gradeObj[i.w6];
          };
          return {
            ...i,
            color
          }
        })

        this.setData({
          alarmLength: length,
          alarm
        })
        this.alarmTimeout()
      }
    })
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
          x: 0,
          x2: 0,
          y: 30,
          y2: 30,
        },
        xAxis: {
          type: 'category',
          axisTick: false,
          boundaryGap: false,
          data: _hours.map((i, n) => {
            let align = ''
            let padding = 0
            switch(n) {
              case 0:
                align = 'left'
                break;
              case _hours.length - 1:
                align = 'right'
                break;
              default:
                align = 'center'
                padding = [0,0,0,5]
                break;
            }
            return {
              ...i,
              value: i.xData,
              textStyle: {
                align,
                padding,
              }
            }
          }),
          axisLine: {
            show: false,
            lineStyle: {
              color: '#a9a9a9'
            }
          },
          axisLabel: {
            interval: 0,//横轴信息全部显示
            rotate: 0, //-30度角倾斜显示
          },
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
            formatter: '{c}°C'
          },
          data: _hours.map((i, index) => ({
            ...i,
            value: i.temp,
            label: {
              offset: index === 0 ? [13, 0] : [0, 0]
            },
          }))
        }]
      };

      chart.setOption(option)
      this.chart = chart;
      return chart;
    });
  },
  init7DayEchart(data) {
    const low = []
    const high = []
    let min = 9999
    let max = -9999
    for (let i = 0; i < data.length; i++) {
      min = Math.min(data[i].min, min)
      max = Math.max(data[i].max, max)
      low.push(data[i].min)
      high.push(data[i].max)
    }

    this.tempEchartsCom.init((canvas, width, height) => {
      const _this = this
      const chart = echarts.init(canvas, null, {
        width: width,
        height: height
      });
      const option = {
        calcubale: false,
        animation: true,
        xAxis: [{
          type: "category",
          boundaryGap: false,
          splitLine: false,
          axisLabel: false,
          splitArea: false,
          axisLine: false,
          axisTick: false,
        }],
        yAxis: [{
          splitLine: false,
          scale: false,
          allowDecimals: false,
          splitNumber: "4",
          min: min * 1,
          max: max * 1,
          type: "value",
          show: false,
          boundaryGap: false,
          splitArea: false,
          axisLine: false,
          axisTick: false,
        }],
        grid: {
          x: 40,
          x2: 40,
          y: 40,
          y2: 40,
          borderWidth: 0
        },
        series: [{
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 5,
          itemStyle: {
            color: "#e69019"
          },
          lineStyle: {
            color: "#ffc16c",
            width: 1
          },
          label: {
            color: "#333",
            show: true,
            fontSize: 14,
            position: "top",
            formatter: '{c}°'
          },
          data: high
        }, {
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 5,
          itemStyle: {
            color: "#5bb0f9",
          },
          lineStyle: {
            color: "#add8fd",
            width: 1
          },
          label: {
            color: "#333",
            fontSize: 14,
            show: true,
            position: "bottom",
            formatter: '{c}°'
          },
          data: low
        }],
        animation: false
      };;

      chart.setOption(option)
      this.tempEchart = chart;
      return chart;
    });
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
    return Number(/\d/g.exec(speed)) - 1 + '级'
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
  },
  format7Day(tq7Day) {
    const rec40Day = this.data.fc40
    const width = Math.ceil(app.globalData.systemInfo.windowWidth / 5)
    const new7Day = tq7Day.map((i, n) => {
      const week = i.week.replace(/星期/g, '')
      const date = i.date.split('-')
      const isToday = /今/g.test(i.day)
      const wea = /转/g.test(i.wea) ? i.wea.split('转') : [i.wea, i.wea]
      const speed = /转/g.test(i.win_speed) ? i.win_speed.split('转')[0] : i.win_speed
      return {
        week,
        isToday,
        wea,
        date: date[1] + '/' + date[2],
        score: rec40Day[n]['012'],
        max: Number(this.formatTemp(i.tem1)),
        min: Number(this.formatTemp(i.tem2)),
        win: i.win,
        speed,
        width: width + 'px'
      }
    })
    return {
      daysWidth: width * 7 + 'px',
      new7Day
    }
  },
  formatIndex(index3d, lunCalender) {
    const style = `
      width: ${(app.globalData.systemInfo.windowWidth / 4)}px;
      height: ${(app.globalData.systemInfo.windowWidth / 4)}px 
    `
    const _index = index3d.i.map(i => ({
      icon: i.i1,
      name: i.i2.replace(/指数/, ''),
      value: i.i4,
      style,
      src: `../../images/index/${i.i1}.png`
    }))

    // 添加万年历
    _index.unshift({
      icon: 'wnl',
      name: '万年历',
      value: lunCalender,
      style,
      src: `../../images/index/wnl.png`
    })
    return _index
  },
  toogleIndexState(e) {
    const _state = this.data.indexState
    const _length = _state ? 8 : this.data.index3d.length
    this.setData({
      indexState: !_state,
      indexLength: _length
    })
  },
  alarmTimeout() {
    clearInterval(this.alarmTimer)
    this.alarmTimer = setTimeout(() => {
      let _current = this.data.currentAlarm
      _current ++
      if (_current == this.data.alarmLength) {
        _current = 0
      }
      this.setData({
        currentAlarm: _current
      }, () => {
        this.alarmTimeout()
      })
    }, 4000)
  }
})
