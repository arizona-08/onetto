"use client"
import React from 'react'
import { useAuthUser } from '../context/AuthUserContext'

function Greetings() {
  const { user } = useAuthUser();
  return (
    <span className="font-title text-2xl font-semibold text-zinc-900">Bonjour{user ? `, ${user.firstname}` : ""}</span>
  )
}

export default Greetings
