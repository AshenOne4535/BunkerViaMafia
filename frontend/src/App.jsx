import JoinForm from './components/JoinForm'

function App() {
    return <JoinForm onJoined={(data) => console.log('Dołączono:', data)} />
}

export default App