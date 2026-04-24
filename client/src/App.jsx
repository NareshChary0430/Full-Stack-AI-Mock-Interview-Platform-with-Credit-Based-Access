
import React from 'react'
import { Routes,Route } from 'react-router-dom' 
import Home from './pages/Home'
import Auth from './pages/auth.jsx'
import Interview from './pages/InterviewPage.jsx'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { setUserData } from './redux/userSlice'
import axios from 'axios'



export const ServerUrl = "http://localhost:8000"

const App = () => {

  const dispatch = useDispatch()

  useEffect(()=>{
    const getUser = async () => {
      try {
        const result = await axios.get(ServerUrl + "/api/user/current-user", {withCredentials:true})
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
<Route path="/interview" element={<Interview />} />
   </Routes>
  )
}

export default App
