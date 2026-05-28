import React from 'react'
import ReactDOM from 'react-dom/client'
import { Component } from '../components/ui/docks'
import './dock-widget.css'

const mount = document.getElementById('dock-widget-root')
if (mount) {
  ReactDOM.createRoot(mount).render(
    <React.StrictMode>
      <Component />
    </React.StrictMode>
  )
}
