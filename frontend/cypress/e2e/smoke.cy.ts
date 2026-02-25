describe('Smoke Test', () => {
    it('should load the home page', () => {
        cy.visit('/');
        cy.contains('Versa').should('be.visible');
    });

    it('should verify accessibility on home page', () => {
        cy.visit('/');
        cy.injectAxe();
        cy.checkA11y(undefined, {
            includedImpacts: ['critical', 'serious']
        }, (violations) => {
            cy.task('log', violations);
        });
    });


});
