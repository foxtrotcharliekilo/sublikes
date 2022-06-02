// ==UserScript==
// @name           SubLikes by 0xt0b3r
// @version        1.2.3
// @description    กดไลค์วิดิโอช่องที่ติดตาม
// @description:th กดไลค์วิดิโอช่องที่ติดตาม
// @author         0xt0b3r
// @license        MIT
// @icon           https://github.com/foxtrotcharliekilo/sublikes/blob/master/logo.svg
// @downloadurl    https://github.com/foxtrotcharliekilo/sublikes/blob/master/ext.js
// @updateurl      https://github.com/foxtrotcharliekilo/sublikes/blob/master/ext.js
// @match          http://*.youtube.com/*
// @match          https://*.youtube.com/*
// @require        https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant          GM_getValue
// @grant          GM_setValue
// @grant          GM_registerMenuCommand
// @run-at         document-idle
// @noframes
// ==/UserScript==

/* global GM_config, GM_info, GM_registerMenuCommand */

(() => {
  'use strict'

  GM_config.init({
    id: 'ytal_config',
    title: GM_info.script.name + ' Settings',
    fields: {
      DEBUG_MODE: {
        label: 'Debug mode',
        type: 'checkbox',
        default: false,
        title: 'บันทึกข้อมูลลงฐานข้อมูล'
      },
      CHECK_FREQUENCY: {
        label: 'Check frequency (ms)',
        type: 'number',
        min: 1,
        default: 5000,
        title: 'ระยะเวลาที่ต้องการให้คอยเช็คสถานะไลค์ (เสี้ยววินาที)'
      },
      WATCH_THRESHOLD: {
        label: 'Watch threshold %',
        type: 'number',
        min: 0,
        max: 100,
        default: 50,
        title: 'เปอร์เซนต์ที่ต้องการให้ดูคลิปก่อนกดไลค์'
      },
      HIDE_LIKE_NOTIFICATION: {
        label: 'ซ่อนการแจ้งเตือน',
        type: 'checkbox',
        default: false
      },
      LIKE_IF_NOT_SUBSCRIBED: {
        label: 'กดไลค์ช่องที่ไม่ได้ติดตาม',
        type: 'checkbox',
        default: false,
        title: 'กดไลค์ช่องที่ไม่ติดตาม'
      }
    }
  })

  GM_registerMenuCommand('Settings', () => {
    GM_config.open()
  })

  function Debugger (name, enabled) {
    this.debug = {}
    if (!window.console) {
      return () => {}
    }
    for (const m in console) {
      if (typeof console[m] === 'function') {
        if (enabled) {
          this.debug[m] = console[m].bind(window.console, name + ': ')
        } else {
          this.debug[m] = () => {}
        }
      }
    }
    return this.debug
  }

  const DEBUG = new Debugger(GM_info.script.name, GM_config.get('DEBUG_MODE'))

  const SELECTORS = {
    PLAYER: '#movie_player',
    SUBSCRIBE_BUTTON: '#subscribe-button > ytd-subscribe-button-renderer > tp-yt-paper-button',
    LIKE_BUTTON: '#menu #top-level-buttons-computed > ytd-toggle-button-renderer:nth-child(1)',
    NOTIFICATION: 'ytd-popup-container'
  }
  const LIKE_BUTTON_CLICKED_CLASS = 'style-default-active'

  const autoLikedVideoIds = []

  setTimeout(wait, GM_config.get('CHECK_FREQUENCY'))

  function getVideoId () {
    const elem = document.querySelector('#page-manager > ytd-watch-flexy')
    if (elem && elem.hasAttribute('video-id')) {
      return elem.getAttribute('video-id')
    } else {
      return new URLSearchParams(window.location.search).get('v')
    }
  }

  function watchThresholdReached () {
    const player = document.querySelector(SELECTORS.PLAYER)
    if (player) {
      return player.getCurrentTime() / player.getDuration() >= (GM_config.get('WATCH_THRESHOLD') / 100)
    }
    return true
  }

  function isSubscribed () {
    DEBUG.info('Checking whether subscribed...')
    const subscribeButton = document.querySelector(SELECTORS.SUBSCRIBE_BUTTON)
    if (!subscribeButton) {
      throw Error('Couldn\'t find sub button')
    }
    const subscribed = subscribeButton.hasAttribute('subscribed')
    DEBUG.info(subscribed ? 'We are subscribed' : 'We are not subscribed')
    return subscribed
  }

  function wait () {
    if (watchThresholdReached()) {
      try {
        if (GM_config.get('LIKE_IF_NOT_SUBSCRIBED') || isSubscribed()) {
          like()
        }
      } catch (e) {
        DEBUG.info(`Failed to like video: ${e}. Will try again in ${GM_config.get('CHECK_FREQUENCY')} ms...`)
      }
    }
    setTimeout(wait, GM_config.get('CHECK_FREQUENCY'))
  }

  function hideLikeNotification () {
    DEBUG.info('Trying to hide notification...')
    const notification = document.querySelector(SELECTORS.NOTIFICATION)
    if (notification) {
      DEBUG.info('Found notification. Hiding it...')
      notification.style.display = 'none'
      setTimeout(() => {
        DEBUG.info('Un-hiding notification')
        notification.style.removeProperty('display')
      }, 5000)
    } else {
      DEBUG.info('Couldn\'t find notification')
    }
  }

  function like () {
    DEBUG.info('Trying to like video...')
    const likeButton = document.querySelector(SELECTORS.LIKE_BUTTON)
    if (!likeButton) {
      throw Error('Couldn\'t find like button')
    }
    const videoId = getVideoId()
    if (likeButton.classList.contains(LIKE_BUTTON_CLICKED_CLASS)) {
      DEBUG.info('Like button has already been clicked')
      autoLikedVideoIds.push(videoId)
    } else if (autoLikedVideoIds.includes(videoId)) {
      DEBUG.info('Video has already been auto-liked. User must ' +
        'have un-liked it, so we won\'t like it again')
    } else {
      DEBUG.info('Found like button')
      if (GM_config.get('HIDE_LIKE_NOTIFICATION')) {
        hideLikeNotification()
      }
      DEBUG.info('It\'s unclicked. Clicking it...')
      likeButton.click()
      autoLikedVideoIds.push(videoId)
      DEBUG.info('Successfully liked video')
    }
  }
})()
