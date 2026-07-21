const game = ()=> {
    let ps=0;
    let cs=0;
    let flag=0;
    const endresult = document.querySelector(".end-result");
    const match = document.querySelector(".match");
    const end_restart_bu = document.querySelector(".end-restart");
    const pw = document.querySelector(".player-wins");
    const cw = document.querySelector(".com-wins");


    const startgame = ()=> {
        const playbut = document.querySelector(".intro button");
        const introscr = document.querySelector(".intro");
        

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
        const restart = document.querySelector(".restart button");
        
        
        
        hands.forEach(hand => {
            hand.addEventListener('animationend',function(){
            this.style.animation = '';
            });
        });

        
       /* endrestart.addEventListener('click',function(){
            endresult.classList.add("fadeout");
            match.classList.add("fadein");
            
            re_start();
        });*/
        restart.addEventListener('click',function(){
            
            re_start();
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
    

    const re_start = ()=>{
        const winner = document.querySelector(".wins");
        const hands = document.querySelectorAll('.hands img');
           
            hands.forEach(hand=>{
                hand.src = `rock.png`;
            });
            winner.classList.remove("playerwin");
            winner.classList.remove("computerwin");
            winner.textContent = 'Choose an option';
            ps=0;
            cs=0;
            score();
    }; 
    const score = ()=> {
        const playerscore = document.querySelector(".player-score p");
        const computerscore = document.querySelector(".computer-score p");
        playerscore.textContent = ps;
        computerscore.textContent = cs;
        if(cs === 3){

            match.classList.remove("fadein");
            match.classList.add("fadeout");
           setTimeout( ()=>{
            endresult.classList.add("fadein");

            // re.textContent = 'Computer Wins the Game';
             pw.style.opacity = 0;
             cw.style.opacity = 1;
            }, 700);
            
            
            
            end_restart_bu.addEventListener('click', function(){
                endresult.classList.remove("fadein");
                endresult.classList.add("fadeout");
                match.classList.add("fadein");
                re_start();
            });
        }
        if(ps === 3){
            match.classList.remove("fadein");
            match.classList.add("fadeout");
            setTimeout( ()=>{
            endresult.classList.add("fadein");

           // re.textContent = 'Player Wins the Game';
            pw.style.opacity = 1;
            cw.style.opacity = 0;
        }, 700);

            end_restart_bu.addEventListener('click', function(){
                endresult.classList.remove("fadein");
                endresult.classList.add("fadeout");
                match.classList.add("fadein");
                re_start();
            });
        }

    };

    const compairhands = (playerchois,comchoise)=> {
        const winner = document.querySelector(".wins");
        if(playerchois === comchoise)
        {
            winner.textContent = 'Tie';
            winner.classList.remove("playerwin");
            winner.classList.remove("computerwin");
            return;
        }
        if(playerchois === 'rock')
        {
            if(comchoise === 'paper')
            {
                winner.textContent = 'Computer Wins';
                winner.classList.remove("playerwin");
                winner.classList.add("computerwin"); 
                cs++;score();return;
            }
            else
            {
                winner.textContent = 'Player Wins';
                winner.classList.remove("computerwin");
                winner.classList.add("playerwin");
                ps++;score();return;
            }
        }
        if(playerchois === 'paper')
        {
            if(comchoise === 'rock')
            {
               
                winner.textContent = 'Player Wins';
                winner.classList.remove("computerwin");
                winner.classList.add("playerwin");
                ps++;score();return;
            }
            else
            {
                winner.textContent = 'Computer Wins';
                winner.classList.remove("playerwin");
                winner.classList.add("computerwin");
                cs++;score();return;
            }
        }
        if(playerchois === 'scissors')
        {
            if(comchoise === 'rock')
            {
                winner.textContent = 'Computer Wins';
                winner.classList.remove("playerwin");
                winner.classList.add("computerwin");
                cs++;score();return;
            }
            else
            {
                winner.textContent = 'Player Wins';
                winner.classList.remove("computerwin");
                winner.classList.add("playerwin");
                ps++;score();return;
            }
        }


    };

    startgame();
    playmatch();
}

game();