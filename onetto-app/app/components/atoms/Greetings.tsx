"use client"
import React from 'react'
import { useAuthUser } from '../context/AuthUserContext'

function Greetings() {
  const { user } = useAuthUser();
  return (
    <span className="font-semibold text-xl text-gray-400">Bonjour {user ? `,${user.firstname}` : ""} </span>
  )
}

export default Greetings