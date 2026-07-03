"use client"
import React from 'react'
import { useAuthUser } from '../context/AuthUserContext'

function Greetings() {
  const { user } = useAuthUser();
  return (
    <span>Bonjour {user ? `,${user.firstname}` : ""} </span>
  )
}

export default Greetings