import QQMap from '../../utils/qq-map.js'

const app = getApp(); 
Page({
  data: {
    isSearch: false,
    result: [],
    value: '',
    hotCity: app.globalData.hotCity,
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
  onLoad() {
    this.setData({
      history: this.getLocal()
    })
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
    wx.removeStorage({ key: 'history'})
    this.setData({
      history: []
    })
  },
  dwHandle() {
    wx.navigateTo({
      url: `../weather/weather`
    })
  },
  hotHandle(e) {
    const { value } = e.currentTarget.dataset
    this.setLocal(value)
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
    const arr = this.getLocal()
    if (!arr.includes(val)) {
      console.log(arr)
      arr.push(val)
      wx.setStorageSync('history', arr)
    }
  },
  getLocal() {
    return wx.getStorageSync('history') ? wx.getStorageSync('history') : []
  },
  delHandle(e) {
    const { value } = e.currentTarget.dataset
    const arr = this.getLocal()
    if (arr.includes(value)) {
      const index = arr.indexOf(value)
      arr.splice(index, 1)
      wx.setStorageSync('history', arr)
      this.setData({
        history: arr
      })
    }
  }
})