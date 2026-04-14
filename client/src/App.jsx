
import React from 'react'
import { Routes,Route } from 'react-router-dom' 
import Home from './pages/Home'
import Auth from './pages/Auth'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { setUserData } from './redux/userSlice'
import axios from 'axios'
import { setUserData } from './redux/userSlice'


export const ServerURL = "http://localhost:8000"

const App = () => {

  const dispatch = useDispatch()

  useEffect(()=>{
    const getUser = async () => {
      try {
        const result = await axios.get(ServerURL + "/api/user/current-user", {withCredentials:true})
        dispatch(setUserData(result.data))
      } catch (error) {
        console.log(error)
        dispatch(setUserData(null))
      }
    }
    getUser()

  },[dispatch])


  return (
   <Routes> 

<Route path="/" element={<Home />} />
<Route path="/auth" element={<Auth />} />
   </Routes>
  )
}

export default App
