const game = ()=> {
    let ps=0;
    let cs=0;

    const startgame = ()=> {
        const playbut = document.querySelector(".intro button");
        const introscr = document.querySelector(".intro");
        const match = document.querySelector(".match");

        playbut.addEventListener("click", ()=> {
            introscr.classList.add("fadeout");
            match.classList.add("fadein");
        });
    }

    const playmatch = ()=> {
        const options = document.querySelectorAll(".options button");
        const playerhand = document.querySelector(".player-hand");
        const computerhand = document.querySelector(".computer-hand");
        const hands = document.querySelectorAll('.hands img');

        hands.forEach(hand => {
            hand.addEventListener('animationend',function(){
            this.style.animation = '';
            });
        });
        
        options.forEach(option => {
            option.addEventListener('click', function(){

                const comoptions = ['paper','rock','scissors'];
                const comnum = Math.floor(Math.random() * 3);
                const comchoise = comoptions[comnum]; 
                setTimeout( ()=>{
                    compairhands(this.textContent,comchoise);
                    playerhand.src = `${this.textContent}.png`;
                    computerhand.src = `${comchoise}.png`;
                }, 2000);
                

                playerhand.style.animation = 'splayerhand 2s ease';
                computerhand.style.animation = 'scomputerhand 2s ease';
             });
         });

    };

    const score = ()=> {
        const playerscore = document.querySelector(".player-score p");
        const computerscore = document.querySelector(".computer-score p");
        playerscore.textContent = ps;
        computerscore.textContent = cs;

    };

    const compairhands = (playerchois,comchoise)=> {
        const winner = document.querySelector(".wins");
        if(playerchois === comchoise)
        {
            winner.textContent = 'Tie';
            return;
        }
        if(playerchois === 'rock')
        {
            if(comchoise === 'paper')
            {
                winner.textContent = 'Computer Wins';cs++;score();return;
            }
            else
            {
                winner.textContent = 'Player Wins';
                ps++;score();return;
            }
        }
        if(playerchois === 'paper')
        {
            if(comchoise === 'rock')
            {
               
                winner.textContent = 'Player Wins';
                
                ps++;score();return;
            }
            else
            {
                winner.textContent = 'Computer Wins';cs++;score();return;
            }
        }
        if(playerchois === 'scissors')
        {
            if(comchoise === 'rock')
            {
                winner.textContent = 'Computer Wins';cs++;score();return;
            }
            else
            {
                winner.textContent = 'Player Wins';ps++;score();return;
            }
        }


    };

    startgame();
    playmatch();
}

game();