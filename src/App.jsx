import Typograf from 'typograf'

const tp = new Typograf({ locale: ['en-US'] })

function App() {
  return (
    <div className="flex flex-col gap-24 py-24 px-8 items-center min-h-screen text-4xl text-center font-bold max-w-3xl mx-auto">
      <p>
        {tp.execute('In 2024 we launched Kurtosis to make study seat search simpler.')}
      </p>

      <div className="relative">
        <div className="absolute flex items-center justify-center inset-[5%] bg-gradient-to-b from-neutral-400 to-neutral-300 p-[10%]">
          <video
            src="/kurtosis.mov"
            autoPlay
            loop
            muted
            playsInline
            className="rounded shadow-xl z-20"
            onLoadedMetadata={(e) => e.target.playbackRate = 2}
          />
        </div>
        <img src="/frame.png" alt="Kurtosis app screenshot" className="relative z-10 drop-shadow-2xl drop-shadow-neutral-800/50" />
      </div>

      <p>
        {tp.execute("Despite our efforts, Kurtosis was recently shut down by KU Leuven's administration.")}
      </p>

      <p>
        {tp.execute('Thank you for your interest in Kurtosis. It was fun while it lasted.')}
      </p>

      <p className="text-sm font-normal text-neutral-500 dark:text-neutral-400">
        Kurtosis could've been an app, but KU Leuven did not allow us to launch it. You can read our{' '}
        <a href="https://kurtosis.breitburg.com/statement/" className="underline hover:text-neutral-700 dark:hover:text-neutral-300" target="_blank" rel="noopener noreferrer">
          statement
        </a>
        {' '}and an{' '}
        <a href="https://www.veto.be/student/studenten-ontwikkelen-alternatief-voor-kurt-maar-ku-leuven-wijst-het-af/352977" className="underline hover:text-neutral-700 dark:hover:text-neutral-300" target="_blank" rel="noopener noreferrer">
          article on Veto
        </a>.
      </p>
{/* 
      <div className="w-3 h-3 rounded-full bg-neutral-300 dark:bg-neutral-700" />

      <div className="grid grid-cols-8 gap-2">
        <div className="w-[30px] h-[30px] flex items-center justify-center bg-neutral-200 dark:bg-neutral-800 rounded cursor-pointer hover:bg-neutral-300 dark:hover:bg-neutral-700">
          <span className="text-lg font-normal">+</span>
        </div>
      </div> */}

      <p class="text-sm font-medium text-neutral-400 flex flex-col">
        <span>Made by <a href="https://breitburg.com/" className="underline" target="_blank" rel="noopener noreferrer">Ilia Breitburg</a>, <a href="https://gbgk.me/" className="underline" target="_blank" rel="noopener noreferrer">George Bougakov</a>, <a href="https://alexandervanhee.be/" className="underline" target="_blank" rel="noopener noreferrer">Alexander Vanhee</a>, and <a href="https://github.com/breitburg/kurtosis/contributors" className="underline" target="_blank" rel="noopener noreferrer">other contributors</a> in Leuven, Belgium.</span>
        <span>&copy; 2025</span>
      </p>
    </div>
  )
}

export default App
