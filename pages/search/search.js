import QQMap from '../../utils/qq-map.js'
import { hotCity } from '../../config.js'
Page({
  data: {
    isSearch: false,
    result: [],
    value: '',
    hotCity,
    history: []
  },
  inputHandle(e) {
    const { value } = e.detail
    if (value) {
      QQMap.getSuggestion({
        keyword: value,
        success: (res) => {
          this.setData({
            isSearch: true,
            result: res.data,
          })
        }
      });
    }
  },
  cancelHandle() {
    wx.navigateBack()
  },
  selectItem(e) {
    const { lat, lng } = e.currentTarget.dataset
    wx.navigateTo({
      url: `../weather/weather?lat=${lat}&lng=${lng}`
    })
  },
  clearHandle() {
    this.setData({
      value: ''
    })
  },
  clearHistory() {
    wx.clearStorage()
  },
  dwHandle() {
    wx.navigateTo({
      url: `../weather/weather`
    })
  },
  hotHandle(e) {
    const { value } = e.currentTarget.dataset
    QQMap.geocoder({
      address: value,
      success: (res) => {
        const { location: { lat, lng } } = res.result
        wx.navigateTo({
          url: `../weather/weather?lat=${lat}&lng=${lng}`
        })
      }
    });
  },
  // 设置历史记录
  setLocal(val) {
    const arr = wx.getStorageInfoSync().split(',')
    if (!arr.includes(val)) {
    }
  }
})