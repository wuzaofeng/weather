import * as Type from '../../server/type.js'
import Request from '../../utils/request.js'
import QQMapWX from '../../libs/qqmap-wx-jssdk.min.js'

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
    scoreHtml: ''
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
        QQMap.reverseGeocoder({
          location: {
            latitude,
            longitude
          },
          success: function (res) {
            const { result: { address_component: { city, district, street_number } } } = res
            _this.setData({
              'address[1].children[0].text': ` ${city} ${district} ${street_number} `
            })
          }
        })
        Request({
          url: Type.LocalDetails,
          data,
          success(res) {
            const date = res.header.Date
            const flag = _this.getDayOrNight(date)
            const { result } = res.data
            _this.setData({
              temp: flag === 'Day' ? result.dayTemp : result.nightTemp,
              weatherDes: flag === 'Day' ? result.dayWeatherDes : result.nightWeatherDes,
              windDirection: flag === 'Day' ? result.dayWindDirection : result.nightWindDirection,
              windPower: flag === 'Day' ? result.dayWindPower : result.nightWindPower,
              scoreHtml: `<i class="iconfont icon-address"></i><span>${result.score}</span>`,
              flag,
            })
            console.log('weather' ,res.data)
          }
        })
      }
    })
  },
  getDayOrNight(date) {
    return new Date(date).getHours() > 18 ? 'night' : 'Day'
  }
})
