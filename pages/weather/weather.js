import * as Type from '../../server/type.js'
import Request from '../../utils/request.js'
import QQMapWX from '../../libs/qqmap-wx-jssdk.min.js'
import { getCity } from '../../utils/util.js'

const QQMap = new QQMapWX({
  key: 'IGNBZ-Y6PK6-ALQSA-EQENE-EAKWE-WJB3B' // key
})

Page({
  data: {
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
    scoreHtml: '',
    cityCode: '',
    dateHtml: ''
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
        _this.reverseGeocoder(latitude, longitude)
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
        const flag = _this.getDayOrNight(date)
        const { result } = res.data
        _this.setData({
          waterHtml: `<i class="iconfont icon-water"></i><span>${result.waterTemp}</span>`,
          paHtml: `<i class="iconfont icon-stress"></i><span>${result.pa}</span>`,
          // temp: flag === 'Day' ? result.dayTemp : result.nightTemp,
          weatherDes: flag === 'Day' ? result.dayWeatherDes : result.nightWeatherDes,
          windDirection: flag === 'Day' ? result.dayWindDirection : result.nightWindDirection,
          windPower: flag === 'Day' ? result.dayWindPower : result.nightWindPower,
          flag,
        })
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
        _this.getTianQiApi(_city.id)
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
        const { fc40, fc1h_24: { jh } } = res.data
        // 获取今天温度
        let dateHtml = '<span class="new">'
        dateHtml += + fc40[0]['009'].substring(4, 6) + '月' + fc40[0]['009'].substring(6, 8) + '日'
        dateHtml += '</span>'
        dateHtml += '<span class="old">(' + fc40[0]['010']
        dateHtml += ')</span>'
        _this.setData({
          dateHtml,
          tempHtml: `<span class="text">${jh[0].jb}<i class="top">°</i></span>`,
        })
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
        let html = `<i class="iconfont icon-notice"></i><span class="text">${tips}</span>`
        _this.setData({
          airtipsHtml: html,
          weatherDes: _data[0].wea,
          scoreHtml: `<i class="iconfont icon-leaf"></i><span>${_data[0].air} ${_data[0].air_level}</span>`,
          windHtml: `<i class="iconfont icon-wind"></i><span>${_this.formatWinSpeed(_data[0].win_speed)}</span>`
        })
      }
    })
  },
  formatWinSpeed(speed) {
    const _speed = Number(speed[1])
    return _speed + '级'
  },
  getDayOrNight(date) {
    return new Date(date).getHours() > 18 ? 'night' : 'Day'
  }
})
